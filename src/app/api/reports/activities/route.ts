import { NextRequest, NextResponse } from 'next/server';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit');
import prisma from '@/lib/prisma';
import { getEligibleCompaniesForObligation } from '@/services/obligationRulesService';
import { ANNUAL_OBLIGATIONS } from '@/types/rules';

/* ─── Constants ─── */
const MONTHLY_CODES = ['dp','fiscal_simples','fiscal_icms','fiscal_servico','financeiro','analise','revisao','ir_aluguel','mit'] as const;
const ALL_CODES     = [...MONTHLY_CODES];

const OBL_NAMES: Record<string, string> = {
  dp:             'Departamento Pessoal',
  fiscal_simples: 'Fiscal — Simples Nacional',
  fiscal_icms:    'Fiscal — ICMS',
  fiscal_servico: 'Fiscal — Serviço',
  financeiro:     'Financeiro',
  analise:        'Análise',
  revisao:        'Revisão',
  ir_aluguel:     'IR Aluguel',
  mit:            'MIT',
  sped_ecd:       'SPED ECD',
  sped_ecf:       'SPED ECF',
};

const MONTH_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/* ─── Design tokens ─── */
const C = {
  navy:    '#0F172A',
  blue:    '#2563EB',
  blueL:   '#DBEAFE',
  green:   '#16A34A',
  greenL:  '#DCFCE7',
  red:     '#DC2626',
  redL:    '#FEE2E2',
  orange:  '#EA580C',
  orangeL: '#FFEDD5',
  purple:  '#7C3AED',
  purpleL: '#EDE9FE',
  slate:   '#64748B',
  slateXL: '#F8FAFC',
  slateL:  '#F1F5F9',
  border:  '#E2E8F0',
  white:   '#FFFFFF',
  blueMid: '#93C5FD',
};

/* ─── Page geometry ─── */
const PW   = 595.28;
const PH   = 841.89;
const ML   = 45;
const CW   = PW - ML * 2;   // 505.28
const BAND = 65;             // header band height
const Y0   = BAND + 12;      // first usable y after header

/* ─── Types ─── */
interface Impediment { label: string; status: string; obs: string | null }
interface OblStats {
  code: string; name: string; isAnnual: boolean;
  total: number; ok: number; sm: number; p: number; sti: number; stc: number; empty: number;
  pct: number;
  impediments: Impediment[];
}

/* ─── Helpers ─── */
function progressColor(pct: number) {
  return pct >= 80 ? C.green : pct >= 50 ? C.orange : C.red;
}

function hexToRgb(hex: string): [number, number, number] {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? [parseInt(m[1],16), parseInt(m[2],16), parseInt(m[3],16)] : [0,0,0];
}

function lighten(hex: string, amount = 0.92): string {
  const [r, g, b] = hexToRgb(hex);
  const mix = (c: number) => Math.round(c * (1 - amount) + 255 * amount);
  return `#${[mix(r),mix(g),mix(b)].map(x => x.toString(16).padStart(2,'0')).join('')}`;
}
lighten; // suppress unused warning — kept for future use

function nowPtBR() {
  const d = new Date();
  return `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}`;
}

/* ─── PDF drawing helpers ─── */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any;

function drawHeaderBand(doc: Doc, month: number, year: number, pageNum: number) {
  // Navy band
  doc.rect(0, 0, PW, BAND).fill(C.navy);
  // Blue bottom stripe
  doc.rect(0, BAND - 3, PW, 3).fill(C.blue);

  // Brand
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.blueMid)
     .text('MAPA DA EQUIPE', ML, 14, { lineBreak: false });

  // Report title
  doc.font('Helvetica-Bold').fontSize(17).fillColor(C.white)
     .text('Relatório de Atividades', ML, 32, { lineBreak: false });

  // Period (right side of band)
  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.blueMid)
     .text(`${MONTH_PT[month-1].toUpperCase()} / ${year}`, PW - ML - 130, 20, { width: 130, align: 'right', lineBreak: false });

  // Page number
  doc.font('Helvetica').fontSize(8).fillColor('#94A3B8')
     .text(`Pág. ${pageNum}`, PW - ML - 130, 36, { width: 130, align: 'right', lineBreak: false });
}

function drawFooter(doc: Doc) {
  doc.rect(0, PH - 26, PW, 26).fill(C.navy);
  doc.font('Helvetica').fontSize(7.5).fillColor('#94A3B8')
     .text(`Mapa da Equipe  •  Gerado em ${nowPtBR()}`, ML, PH - 17, { lineBreak: false });
  doc.font('Helvetica').fontSize(7.5).fillColor('#475569')
     .text('Este documento é gerado automaticamente e reflete os dados no momento da geração.',
           ML, PH - 17, { width: CW, align: 'right', lineBreak: false });
}

function drawProgressBar(doc: Doc, x: number, y: number, w: number, h: number, pct: number) {
  doc.roundedRect(x, y, w, h, h / 2).fill(C.border);
  if (pct > 0) {
    const barW = Math.max(h, Math.round(w * pct / 100));
    doc.roundedRect(x, y, barW, h, h / 2).fill(progressColor(pct));
  }
}

function drawStatusPill(doc: Doc, x: number, y: number, label: string, value: number, color: string, bg: string): number {
  const text = `${label}: ${value}`;
  doc.font('Helvetica').fontSize(8);  // set font before widthOfString
  const tw = doc.widthOfString(text) + 12;
  doc.roundedRect(x, y, tw, 14, 3).fill(bg);
  doc.fillColor(color).text(text, x + 6, y + 3, { lineBreak: false });
  return tw + 5;
}

/* ─── Route handler ─── */
export async function GET(req: NextRequest) {
  try {
    const url   = new URL(req.url);
    const month = Math.min(12, Math.max(1, parseInt(url.searchParams.get('month') ?? String(new Date().getMonth() + 1))));
    const year  = parseInt(url.searchParams.get('year') ?? String(new Date().getFullYear()));

    /* ── 1. Obligations ── */
    const oblRecords = await prisma.obligation.findMany({
      where: { code: { in: ALL_CODES } },
      select: { id: true, code: true, name: true },
    });
    const oblByCode = new Map(oblRecords.map(o => [o.code, o]));

    /* ── 2. Motor (parallel) ── */
    const motorResults = await Promise.all(
      ALL_CODES.map(async (code) => {
        try {
          const eligible = await getEligibleCompaniesForObligation({ obligationCode: code, year, includeTerminated: false });
          return { code, eligible };
        } catch { return { code, eligible: [] }; }
      })
    );

    /* ── 3. All statuses for this year ── */
    const allOblIds = oblRecords.map(o => o.id);
    const rawStatuses = await prisma.activityStatus.findMany({
      where: { obligationId: { in: allOblIds }, year },
      select: { companyId: true, obligationId: true, month: true, status: true, observation: true },
    });

    // Lookup: oblId → month → companyId → {status, obs}
    const statusLookup = new Map<number, Map<number, Map<number, { status: string; obs: string | null }>>>();
    for (const s of rawStatuses) {
      if (!statusLookup.has(s.obligationId)) statusLookup.set(s.obligationId, new Map());
      const byM = statusLookup.get(s.obligationId)!;
      if (!byM.has(s.month)) byM.set(s.month, new Map());
      byM.get(s.month)!.set(s.companyId, { status: s.status, obs: s.observation });
    }

    /* ── 4. Compute stats per obligation ── */
    const oblStats: OblStats[] = [];
    const allEligibleIds = new Set<number>();

    for (const { code, eligible } of motorResults) {
      const obl = oblByCode.get(code);
      if (!obl || eligible.length === 0) continue;

      const isAnnual    = (ANNUAL_OBLIGATIONS as readonly string[]).includes(code);
      const targetMonth = isAnnual ? 0 : month;
      const inScope     = isAnnual ? eligible : eligible.filter(c => c.months[month - 1]?.eligible);
      if (inScope.length === 0) continue;

      inScope.forEach(c => allEligibleIds.add(c.companyId));

      const monthMap = statusLookup.get(obl.id)?.get(targetMonth) ?? new Map<number, { status: string; obs: string | null }>();
      let ok = 0, sm = 0, p = 0, sti = 0, stc = 0;
      const impediments: Impediment[] = [];

      for (const c of inScope) {
        const entry = monthMap.get(c.companyId);
        if (!entry) continue;
        const label = c.code ? `${c.code} — ${c.corporateName}` : c.corporateName;
        switch (entry.status) {
          case 'OK':   ok++;  break;
          case 'S/M':  sm++;  break;
          case 'P':    p++;   impediments.push({ label, status: 'P',    obs: entry.obs }); break;
          case 'ST-I': sti++; impediments.push({ label, status: 'ST-I', obs: entry.obs }); break;
          case 'ST-C': stc++; impediments.push({ label, status: 'ST-C', obs: entry.obs }); break;
        }
      }

      const total = inScope.length;
      const empty = total - ok - sm - p - sti - stc;
      const pct   = total > 0 ? Math.round((ok + sm) / total * 100) : 0;

      oblStats.push({
        code, name: OBL_NAMES[code] ?? obl.name, isAnnual,
        total, ok, sm, p, sti, stc, empty, pct,
        impediments: impediments.sort((a, b) => a.label.localeCompare(b.label)),
      });
    }

    /* ── 5. Overall KPIs ── */
    const totalCompanies = allEligibleIds.size;
    const totalActs  = oblStats.reduce((s, o) => s + o.total, 0);
    const totalOk    = oblStats.reduce((s, o) => s + o.ok + o.sm, 0);
    const totalP     = oblStats.reduce((s, o) => s + o.p, 0);
    const totalSt    = oblStats.reduce((s, o) => s + o.sti + o.stc, 0);
    const totalEmpty = oblStats.reduce((s, o) => s + o.empty, 0);
    const overallPct = totalActs > 0 ? Math.round(totalOk / totalActs * 100) : 0;

    /* ── 6. Empresas críticas (2+ impedimentos) ── */
    const companyImpMap = new Map<string, { label: string; issues: Array<{ oblName: string; status: string; obs: string | null }> }>();
    for (const obl of oblStats) {
      for (const imp of obl.impediments) {
        if (!companyImpMap.has(imp.label)) companyImpMap.set(imp.label, { label: imp.label, issues: [] });
        companyImpMap.get(imp.label)!.issues.push({ oblName: obl.name, status: imp.status, obs: imp.obs });
      }
    }
    const criticalCompanies = Array.from(companyImpMap.values())
      .filter((c) => c.issues.length >= 2)
      .sort((a, b) => b.issues.length - a.issues.length);

    /* ── 7. Comparativo mês anterior ── */
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear  = month === 1 ? year - 1 : year;
    const prevRaw   = await prisma.activityStatus.findMany({
      where: { obligationId: { in: allOblIds }, year: prevYear, month: prevMonth },
      select: { companyId: true, obligationId: true, status: true },
    });
    const prevLookup = new Map<number, Map<number, string>>();  // oblId → companyId → status
    for (const s of prevRaw) {
      if (!prevLookup.has(s.obligationId)) prevLookup.set(s.obligationId, new Map());
      prevLookup.get(s.obligationId)!.set(s.companyId, s.status);
    }
    const prevOblPct = new Map<string, number>();  // code → pct
    for (const { code, eligible } of motorResults) {
      const obl = oblByCode.get(code);
      if (!obl) continue;
      const inScope = eligible.filter((c) => c.months[prevMonth - 1]?.eligible ?? true);
      if (inScope.length === 0) { prevOblPct.set(code, 0); continue; }
      const prevMap = prevLookup.get(obl.id) ?? new Map<number, string>();
      const done = inScope.filter((c) => { const s = prevMap.get(c.companyId); return s === 'OK' || s === 'S/M'; }).length;
      prevOblPct.set(code, Math.round(done / inScope.length * 100));
    }
    const MONTH_PT_ABBR = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

    /* ── 8. Alertas de prazo ──
       This report aggregates pending counts per obligation as a whole (not per
       company), so it can't reflect the Financeiro/Análise per-tax-regime split
       the Dashboard now supports. Collapse to one deadline per obligation here
       (preferring the general one) to avoid duplicate/misleading alert rows. */
    const deadlineRows = await prisma.deadline.findMany({
      where: { active: true },
      include: { obligation: { select: { id: true, code: true } } },
    });
    const deadlineByObligationId = new Map<number, typeof deadlineRows[number]>();
    for (const dl of deadlineRows) {
      const current = deadlineByObligationId.get(dl.obligationId);
      if (!current || (current.taxRegimeId !== null && dl.taxRegimeId === null)) {
        deadlineByObligationId.set(dl.obligationId, dl);
      }
    }
    const today    = new Date();
    const todayDay = today.getDate();
    interface DeadlineAlert { oblName: string; dueDay: number; pendingCount: number; daysUntilDue: number }
    const deadlineAlerts: DeadlineAlert[] = [];
    for (const dl of Array.from(deadlineByObligationId.values())) {
      const obl = oblStats.find((o) => o.code === dl.obligation.code);
      if (!obl) continue;
      const pending = obl.p + obl.sti;
      if (pending === 0) continue;
      deadlineAlerts.push({ oblName: obl.name, dueDay: dl.dueDay, pendingCount: pending, daysUntilDue: dl.dueDay - todayDay });
    }
    deadlineAlerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);

    /* ── 6. Generate PDF ── */
    const doc: Doc = new PDFDocument({
      autoFirstPage: false,
      compress: true,
      info: {
        Title: `Relatório de Atividades — ${MONTH_PT[month-1]} ${year}`,
        Author: 'Mapa da Equipe',
        Subject: 'Relatório de Atividades Mensais',
      },
    });

    const chunks: Buffer[] = [];
    const pdfDone = new Promise<Buffer>((resolve, reject) => {
      doc.on('data', (c: Buffer) => chunks.push(c));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);
    });

    let pageNum = 0;

    const newPage = (): number => {
      pageNum++;
      doc.addPage({ size: 'A4', margins: { top: 0, left: 0, right: 0, bottom: 0 } });
      drawHeaderBand(doc, month, year, pageNum);
      drawFooter(doc);
      return Y0;
    };

    const checkPage = (y: number, neededH: number): number => {
      if (y + neededH > PH - 40) return newPage();
      return y;
    };

    // ── PAGE 1 ────────────────────────────────────────────────────────────────
    let y = newPage();

    // Period hero
    doc.font('Helvetica').fontSize(8).fillColor(C.slate)
       .text('COMPETÊNCIA', ML, y + 4, { width: CW, align: 'center', characterSpacing: 2, lineBreak: false });
    y += 20;

    doc.font('Helvetica-Bold').fontSize(30).fillColor(C.blue)
       .text(`${MONTH_PT[month-1].toUpperCase()} / ${year}`, ML, y, { width: CW, align: 'center', lineBreak: false });
    y += 44;

    // Thin divider
    doc.moveTo(ML + 40, y).lineTo(PW - ML - 40, y).lineWidth(0.5).strokeColor(C.border).stroke();
    y += 16;

    // ── KPI row ──
    const kpiDefs = [
      { label: 'Empresas ativas',  value: String(totalCompanies), sub: 'elegíveis no período', accent: C.blue,   bg: C.blueL,   tc: C.blue   },
      { label: 'Concluídas',       value: String(totalOk),         sub: 'OK + Sem Movimento',   accent: C.green,  bg: C.greenL,  tc: C.green  },
      { label: 'Pendências',       value: String(totalP),          sub: 'aguardando resolução', accent: C.red,    bg: C.redL,    tc: C.red    },
      { label: 'Standby',          value: String(totalSt),         sub: 'ST-I / ST-C',          accent: C.purple, bg: C.purpleL, tc: C.purple },
    ];

    const kW  = 112;
    const kH  = 76;
    const kGap = Math.floor((CW - kW * 4) / 3);

    for (let i = 0; i < kpiDefs.length; i++) {
      const k  = kpiDefs[i];
      const kx = ML + i * (kW + kGap);
      const ky = y;

      doc.roundedRect(kx, ky, kW, kH, 6).fill(k.bg);
      doc.rect(kx, ky, kW, 4).fill(k.accent);  // top accent
      doc.font('Helvetica-Bold').fontSize(27).fillColor(k.tc)
         .text(k.value, kx, ky + 14, { width: kW, align: 'center', lineBreak: false });
      doc.font('Helvetica').fontSize(7.5).fillColor(k.tc)
         .text(k.sub, kx + 4, ky + 44, { width: kW - 8, align: 'center', lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.slate)
         .text(k.label, kx + 4, ky + 58, { width: kW - 8, align: 'center', lineBreak: false });
    }
    y += kH + 18;

    // ── Overall completion bar ──
    doc.roundedRect(ML, y, CW, 52, 6).fill(C.slateXL);
    doc.rect(ML, y, 4, 52).fill(progressColor(overallPct));

    const barLabelX = ML + 14;
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.navy)
       .text('Conclusão Geral', barLabelX, y + 10, { lineBreak: false });
    doc.font('Helvetica').fontSize(8.5).fillColor(C.slate)
       .text(`${totalOk} concluídas  ·  ${totalEmpty} sem status  ·  ${totalP + totalSt} com impedimento`, barLabelX, y + 26, { lineBreak: false });

    const bigPct = `${overallPct}%`;
    doc.font('Helvetica-Bold').fontSize(20).fillColor(progressColor(overallPct))
       .text(bigPct, ML, y + 8, { width: CW - 10, align: 'right', lineBreak: false });

    drawProgressBar(doc, barLabelX, y + 40, CW - 24, 7, overallPct);
    y += 64;

    // ── ANÁLISE TEXTUAL ──────────────────────────────────────────────────────
    y = checkPage(y, 40);
    doc.moveTo(ML, y).lineTo(PW - ML, y).lineWidth(0.4).strokeColor(C.border).stroke();
    y += 12;

    doc.roundedRect(ML, y, CW, 24, 4).fill('#1E3A5F');
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
       .text('ANÁLISE DO PERÍODO', ML + 10, y + 7, { characterSpacing: 0.8, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(C.blueMid)
       .text(`Competência: ${MONTH_PT[month-1]} / ${year}`, ML, y + 8, { width: CW - 10, align: 'right', lineBreak: false });
    y += 30;

    // 1 — Situação geral (parágrafo narrativo)
    {
      const situacaoAdj = overallPct >= 80 ? 'satisfatório' : overallPct >= 50 ? 'regular' : 'abaixo do esperado';
      const partes: string[] = [`Das ${totalActs} atividades previstas para ${MONTH_PT[month-1]}/${year}, ${totalOk} foram concluídas (OK ou S/M), atingindo ${overallPct}% de conclusão — desempenho ${situacaoAdj}.`];
      if (totalP > 0)     partes.push(`${totalP} atividade${totalP !== 1 ? 's estão' : ' está'} com pendência aguardando resolução.`);
      if (totalSt > 0)    partes.push(`${totalSt} atividade${totalSt !== 1 ? 's encontram-se' : ' encontra-se'} em standby (interno ou de cliente).`);
      if (totalEmpty > 0) partes.push(`${totalEmpty} atividade${totalEmpty !== 1 ? 's ainda não foram' : ' ainda não foi'} preenchida${totalEmpty !== 1 ? 's' : ''}.`);
      const paragrafo = partes.join(' ');
      const pColor = progressColor(overallPct);
      y = checkPage(y, 52);
      doc.rect(ML, y, 4, 44).fill(pColor);
      doc.rect(ML + 4, y, CW - 4, 44).fill(C.slateXL);
      doc.font('Helvetica').fontSize(9).fillColor(C.navy)
         .text(paragrafo, ML + 14, y + 8, { width: CW - 26, lineBreak: true });
      y = Math.max(y + 44, doc.y) + 12;
    }

    // 2 — Concluídas (100%)
    {
      const oblOk = oblStats.filter((o) => o.pct === 100 && o.total > 0);
      if (oblOk.length > 0) {
        y = checkPage(y, 30 + oblOk.length * 14);
        doc.rect(ML, y, 4, 18).fill(C.green);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.green)
           .text('EM DIA — OBRIGAÇÕES 100% CONCLUÍDAS', ML + 10, y + 4, { lineBreak: false });
        y += 22;
        for (const obl of oblOk) {
          y = checkPage(y, 14);
          doc.font('Helvetica').fontSize(8.5).fillColor(C.navy)
             .text(`• ${obl.name}`, ML + 14, y, { lineBreak: false, continued: true });
          doc.font('Helvetica').fontSize(8).fillColor(C.slate)
             .text(`  (${obl.ok + obl.sm} empresa${obl.ok + obl.sm !== 1 ? 's' : ''})`, { lineBreak: false });
          y += 14;
        }
        y += 8;
      }
    }

    // 3 — Pendências (P)
    {
      const pends = oblStats.flatMap((o) =>
        o.impediments.filter((i) => i.status === 'P').map((i) => ({ ...i, oblName: o.name }))
      );
      if (pends.length > 0) {
        const estH = 30 + pends.reduce((s, p) => s + (p.obs ? 28 : 14), 0);
        y = checkPage(y, Math.min(estH, 80));
        doc.rect(ML, y, 4, 18).fill(C.red);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.red)
           .text('PENDÊNCIAS — REQUEREM ATENÇÃO', ML + 10, y + 4, { lineBreak: false });
        y += 22;
        for (const p of pends) {
          y = checkPage(y, p.obs ? 28 : 14);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
             .text(`• ${p.oblName}: `, ML + 14, y, { lineBreak: false, continued: true });
          doc.font('Helvetica').fontSize(8.5).fillColor(C.navy)
             .text(p.label, { lineBreak: false });
          y += 13;
          if (p.obs) {
            const obsStr = p.obs.length > 110 ? p.obs.slice(0, 108) + '…' : p.obs;
            doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.slate)
               .text(`   Motivo: "${obsStr}"`, ML + 20, y, { width: CW - 32, lineBreak: false });
            y += 13;
          }
        }
        y += 8;
      }
    }

    // 4 — Standby Interno (ST-I)
    {
      const stis = oblStats.flatMap((o) =>
        o.impediments.filter((i) => i.status === 'ST-I').map((i) => ({ ...i, oblName: o.name }))
      );
      if (stis.length > 0) {
        const estH = 30 + stis.reduce((s, p) => s + (p.obs ? 28 : 14), 0);
        y = checkPage(y, Math.min(estH, 80));
        doc.rect(ML, y, 4, 18).fill(C.orange);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.orange)
           .text('STANDBY INTERNO — AGUARDANDO RESOLUÇÃO INTERNA', ML + 10, y + 4, { lineBreak: false });
        y += 22;
        for (const s of stis) {
          y = checkPage(y, s.obs ? 28 : 14);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
             .text(`• ${s.oblName}: `, ML + 14, y, { lineBreak: false, continued: true });
          doc.font('Helvetica').fontSize(8.5).fillColor(C.navy)
             .text(s.label, { lineBreak: false });
          y += 13;
          if (s.obs) {
            const obsStr = s.obs.length > 110 ? s.obs.slice(0, 108) + '…' : s.obs;
            doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.slate)
               .text(`   Motivo: "${obsStr}"`, ML + 20, y, { width: CW - 32, lineBreak: false });
            y += 13;
          }
        }
        y += 8;
      }
    }

    // 5 — Standby Cliente (ST-C)
    {
      const stcs = oblStats.flatMap((o) =>
        o.impediments.filter((i) => i.status === 'ST-C').map((i) => ({ ...i, oblName: o.name }))
      );
      if (stcs.length > 0) {
        y = checkPage(y, 30 + stcs.length * 14);
        doc.rect(ML, y, 4, 18).fill(C.purple);
        doc.font('Helvetica-Bold').fontSize(9).fillColor(C.purple)
           .text('STANDBY CLIENTE — AGUARDANDO RETORNO DO CLIENTE', ML + 10, y + 4, { lineBreak: false });
        y += 22;
        for (const s of stcs) {
          y = checkPage(y, s.obs ? 28 : 14);
          doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
             .text(`• ${s.oblName}: `, ML + 14, y, { lineBreak: false, continued: true });
          doc.font('Helvetica').fontSize(8.5).fillColor(C.navy)
             .text(s.label, { lineBreak: false });
          y += 13;
          if (s.obs) {
            const obsStr = s.obs.length > 110 ? s.obs.slice(0, 108) + '…' : s.obs;
            doc.font('Helvetica-Oblique').fontSize(8).fillColor(C.slate)
               .text(`   Motivo: "${obsStr}"`, ML + 20, y, { width: CW - 32, lineBreak: false });
            y += 13;
          }
        }
        y += 8;
      }
    }

    // ── EMPRESAS CRÍTICAS (2+ impedimentos) ──────────────────────────────────
    if (criticalCompanies.length > 0) {
      y = checkPage(y, 40);
      doc.rect(ML, y, 4, 18).fill(C.red);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.red)
         .text('ATENÇÃO REDOBRADA — EMPRESAS COM MÚLTIPLOS PROBLEMAS', ML + 10, y + 4, { lineBreak: false });
      y += 22;
      for (const co of criticalCompanies) {
        const rowH = 14 + co.issues.length * 13;
        y = checkPage(y, rowH + 4);
        doc.rect(ML + 8, y, CW - 8, rowH + 2).fill('#FFF7ED');
        doc.rect(ML + 8, y, 3, rowH + 2).fill(C.red);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
           .text(co.label, ML + 16, y + 4, { width: CW - 30, lineBreak: false });
        let iy = y + 15;
        for (const issue of co.issues) {
          const stColor = issue.status === 'P' ? C.red : issue.status === 'ST-I' ? C.orange : C.purple;
          doc.font('Helvetica-Bold').fontSize(7.5).fillColor(stColor)
             .text(`[${issue.status}]`, ML + 16, iy, { lineBreak: false, continued: true });
          doc.font('Helvetica').fontSize(7.5).fillColor(C.slate)
             .text(` ${issue.oblName}${issue.obs ? ` — "${issue.obs.slice(0, 60)}${issue.obs.length > 60 ? '…' : ''}"` : ''}`, { width: CW - 36, lineBreak: false });
          iy += 13;
        }
        y += rowH + 6;
      }
      y += 8;
    }

    // ── ALERTAS DE PRAZO ─────────────────────────────────────────────────────
    if (deadlineAlerts.length > 0) {
      y = checkPage(y, 40 + deadlineAlerts.length * 17);
      doc.rect(ML, y, 4, 18).fill(C.orange);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.orange)
         .text('ALERTAS DE PRAZO — PENDÊNCIAS COM VENCIMENTO PRÓXIMO', ML + 10, y + 4, { lineBreak: false });
      y += 22;
      for (const alert of deadlineAlerts) {
        y = checkPage(y, 18);
        const urgColor  = alert.daysUntilDue < 0 ? C.red : alert.daysUntilDue <= 3 ? C.orange : C.green;
        const urgLabel  = alert.daysUntilDue < 0
          ? `Vencido há ${Math.abs(alert.daysUntilDue)} dia(s)`
          : alert.daysUntilDue === 0
          ? 'Vence hoje'
          : `${alert.daysUntilDue} dia(s) para o prazo (dia ${alert.dueDay})`;
        const urgBg = alert.daysUntilDue < 0 ? C.redL : alert.daysUntilDue <= 3 ? C.orangeL : C.greenL;
        doc.rect(ML + 8, y, CW - 8, 16).fill(urgBg);
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
           .text(`• ${alert.oblName}`, ML + 14, y + 3, { lineBreak: false, continued: true });
        doc.font('Helvetica').fontSize(8).fillColor(C.slate)
           .text(`  ${alert.pendingCount} pendente${alert.pendingCount !== 1 ? 's' : ''}`, { lineBreak: false, continued: true });
        doc.font('Helvetica-Bold').fontSize(8).fillColor(urgColor)
           .text(`  ${urgLabel}`, { lineBreak: false });
        y += 18;
      }
      y += 8;
    }

    // ── COMPARATIVO COM MÊS ANTERIOR ─────────────────────────────────────────
    {
      y = checkPage(y, 50 + oblStats.length * 18);
      doc.moveTo(ML, y).lineTo(PW - ML, y).lineWidth(0.4).strokeColor(C.border).stroke();
      y += 10;
      doc.rect(ML, y, 4, 18).fill(C.blue);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(C.blue)
         .text(`COMPARATIVO: ${MONTH_PT_ABBR[prevMonth - 1].toUpperCase()}/${prevYear}  →  ${MONTH_PT_ABBR[month - 1].toUpperCase()}/${year}`, ML + 10, y + 4, { lineBreak: false });
      y += 22;
      // Header row
      const col1 = ML + 8, col2 = ML + 285, col3 = ML + 355, col4 = ML + 425;
      doc.rect(ML + 8, y, CW - 8, 16).fill(C.navy);
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
         .text('OBRIGAÇÃO', col1 + 4, y + 4, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blueMid)
         .text(MONTH_PT_ABBR[prevMonth - 1], col2, y + 4, { width: 64, align: 'center', lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor(C.white)
         .text(MONTH_PT_ABBR[month - 1], col3, y + 4, { width: 64, align: 'center', lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8).fillColor('#86EFAC')
         .text('VARIAÇÃO', col4, y + 4, { width: 64, align: 'center', lineBreak: false });
      y += 18;
      for (let i = 0; i < oblStats.length; i++) {
        const obl  = oblStats[i];
        const prev = prevOblPct.get(obl.code) ?? 0;
        const curr = obl.pct;
        const diff = curr - prev;
        const diffColor = diff > 0 ? C.green : diff < 0 ? C.red : C.slate;
        const diffStr   = diff > 0 ? `+${diff}%` : diff < 0 ? `${diff}%` : '—';
        y = checkPage(y, 17);
        doc.rect(ML + 8, y, CW - 8, 16).fill(i % 2 === 0 ? C.white : C.slateXL);
        doc.font('Helvetica').fontSize(8.5).fillColor(C.navy)
           .text(obl.name, col1 + 4, y + 3, { width: 270, lineBreak: false });
        // prev bar + %
        drawProgressBar(doc, col2, y + 5, 44, 5, prev);
        doc.font('Helvetica').fontSize(7.5).fillColor(C.slate)
           .text(`${prev}%`, col2 + 46, y + 3, { lineBreak: false });
        // curr bar + %
        drawProgressBar(doc, col3, y + 5, 44, 5, curr);
        doc.font('Helvetica-Bold').fontSize(7.5).fillColor(progressColor(curr))
           .text(`${curr}%`, col3 + 46, y + 3, { lineBreak: false });
        // diff
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor(diffColor)
           .text(diffStr, col4, y + 3, { width: 64, align: 'center', lineBreak: false });
        y += 17;
      }
      y += 10;
    }

    // ── Section heading ──
    y = checkPage(y, 35);
    doc.moveTo(ML, y).lineTo(PW - ML, y).lineWidth(0.4).strokeColor(C.border).stroke();
    y += 12;

    doc.roundedRect(ML, y, CW, 24, 4).fill(C.navy);
    doc.font('Helvetica-Bold').fontSize(9).fillColor(C.white)
       .text('DETALHAMENTO POR OBRIGAÇÃO', ML + 10, y + 7, { characterSpacing: 0.8, lineBreak: false });
    doc.font('Helvetica').fontSize(8).fillColor(C.blueMid)
       .text(`Referência: ${MONTH_PT[month-1]} / ${year}`, ML, y + 8, { width: CW - 10, align: 'right', lineBreak: false });
    y += 32;

    // ── Per-obligation cards ──
    for (const obl of oblStats) {
      const impCount = obl.impediments.length;
      const cardH = 68 + (impCount > 0 ? 22 + impCount * 17 : 0);

      y = checkPage(y, cardH + 8);

      // Card background
      doc.roundedRect(ML, y, CW, cardH, 5).fill(C.slateXL);
      // Left accent
      doc.roundedRect(ML, y, 4, cardH, 2).fill(progressColor(obl.pct));

      const cx = ML + 14;
      const cw = CW - 22;

      // Obligation name
      doc.font('Helvetica-Bold').fontSize(10.5).fillColor(C.navy)
         .text(obl.name, cx, y + 11, { lineBreak: false });

      // Annual badge
      if (obl.isAnnual) {
        doc.font('Helvetica-Bold').fontSize(7);  // set font before widthOfString
        const bw = doc.widthOfString('ANUAL') + 10;
        doc.roundedRect(cx + 200, y + 10, bw, 13, 3).fill(C.blueL);
        doc.fillColor(C.blue).text('ANUAL', cx + 205, y + 13, { lineBreak: false });
      }

      // Total (right-aligned)
      doc.font('Helvetica').fontSize(8).fillColor(C.slate)
         .text(`${obl.total} empresa${obl.total !== 1 ? 's' : ''} elegíve${obl.total !== 1 ? 'is' : 'l'}`,
               cx, y + 12, { width: cw, align: 'right', lineBreak: false });

      // Progress bar + percentage
      const barW = cw - 48;
      drawProgressBar(doc, cx, y + 30, barW, 8, obl.pct);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(progressColor(obl.pct))
         .text(`${obl.pct}%`, cx + barW + 6, y + 27, { lineBreak: false });

      // Status pills
      let px = cx;
      const pills = [
        { label: 'OK',    value: obl.ok,    color: C.green,  bg: C.greenL  },
        { label: 'S/M',   value: obl.sm,    color: '#1D4ED8', bg: C.blueL   },
        { label: 'P',     value: obl.p,     color: C.red,    bg: C.redL    },
        { label: 'ST-I',  value: obl.sti,   color: C.orange, bg: C.orangeL },
        { label: 'ST-C',  value: obl.stc,   color: C.purple, bg: C.purpleL },
        { label: 'Vazio', value: obl.empty, color: C.slate,  bg: C.border  },
      ];
      for (const pill of pills) {
        if (pill.value > 0) {
          px += drawStatusPill(doc, px, y + 48, pill.label, pill.value, pill.color, pill.bg);
        }
      }

      // Impediments
      if (impCount > 0) {
        const sepY = y + 65;
        doc.moveTo(cx, sepY).lineTo(cx + cw, sepY).lineWidth(0.3).strokeColor('#CBD5E1').stroke();

        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.orange)
           .text('Impedimentos / Pendências:', cx, sepY + 5, { lineBreak: false });

        let iy = sepY + 18;
        for (const imp of obl.impediments) {
          const stColor = imp.status === 'P' ? C.red : imp.status === 'ST-I' ? C.orange : C.purple;
          const stBg    = imp.status === 'P' ? C.redL : imp.status === 'ST-I' ? C.orangeL : C.purpleL;
          doc.font('Helvetica-Bold').fontSize(8);  // set font before widthOfString
          const bw = doc.widthOfString(imp.status) + 12;

          doc.roundedRect(cx + 8, iy, bw, 13, 3).fill(stBg);
          doc.font('Helvetica-Bold').fontSize(8).fillColor(stColor)
             .text(imp.status, cx + 14, iy + 2.5, { lineBreak: false });

          // Company name (truncate if very long)
          const maxLabelW = cw - bw - 24;
          const nameStr = imp.label.length > 70 ? imp.label.slice(0, 68) + '…' : imp.label;
          doc.font('Helvetica').fontSize(8.5).fillColor(C.navy)
             .text(nameStr, cx + bw + 16, iy + 2, { width: maxLabelW, lineBreak: false });

          // Observation (if present, italic below name)
          if (imp.obs) {
            const obsStr = imp.obs.length > 90 ? imp.obs.slice(0, 88) + '…' : imp.obs;
            doc.font('Helvetica-Oblique').fontSize(7.5).fillColor(C.slate)
               .text(`"${obsStr}"`, cx + bw + 16, iy + 14, { width: maxLabelW, lineBreak: false });
            iy += 13;
          }
          iy += 17;
        }
      }

      y += cardH + 8;
    }

    // ── Summary table at the end ──
    const summaryItems = [
      { label: 'Total de obrigações analisadas', value: String(oblStats.length) },
      { label: 'Total de atividades no período', value: String(totalActs) },
      { label: 'Concluídas (OK + S/M)', value: `${totalOk}  (${overallPct}%)` },
      { label: 'Com pendência (P)', value: String(totalP) },
      { label: 'Em standby (ST-I / ST-C)', value: String(totalSt) },
      { label: 'Sem preenchimento', value: String(totalEmpty) },
    ];
    // Reserve exact height: divider(16) + header(50) + rows + bottom-line(4)
    const summaryBlockH = 16 + 50 + summaryItems.length * 17 + 4;
    y = checkPage(y, summaryBlockH);

    y += 4;
    doc.moveTo(ML, y).lineTo(PW - ML, y).lineWidth(0.4).strokeColor(C.border).stroke();
    y += 12;

    doc.roundedRect(ML, y, CW, 22, 4).fill(C.slateL);
    doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
       .text('RESUMO FINAL', ML + 10, y + 6, { lineBreak: false });
    y += 28;

    for (let i = 0; i < summaryItems.length; i++) {
      const s   = summaryItems[i];
      const sy  = y + i * 17;
      const bg  = i % 2 === 0 ? C.white : C.slateXL;
      doc.rect(ML, sy, CW, 17).fill(bg);
      doc.font('Helvetica').fontSize(8.5).fillColor(C.slate)
         .text(s.label, ML + 10, sy + 4, { lineBreak: false });
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(C.navy)
         .text(s.value, ML, sy + 4, { width: CW - 10, align: 'right', lineBreak: false });
    }
    y += summaryItems.length * 17 + 2;
    // Only draw the bottom border line if safely above the footer
    if (y < PH - 46) {
      doc.rect(ML, y, CW, 1).fill(C.border);
    }

    // Wrap up
    doc.end();
    const pdfBuffer = await pdfDone;

    const filename = `relatorio_atividades_${MONTH_PT[month-1].toLowerCase()}_${year}.pdf`;
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Content-Length': String(pdfBuffer.length),
      },
    });

  } catch (e: unknown) {
    console.error('PDF report error:', e);
    return NextResponse.json({ error: 'Erro ao gerar relatório PDF' }, { status: 500 });
  }
}
