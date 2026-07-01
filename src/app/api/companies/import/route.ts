import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { createCompany, updateCompany } from '@/services/companyService';

function parseBool(v: unknown): boolean {
  if (typeof v === 'boolean') return v;
  const s = String(v ?? '').toLowerCase().trim();
  return s === 'sim' || s === 's' || s === 'yes' || s === '1' || s === 'true';
}

function cleanDoc(v: unknown): string | null {
  const s = String(v ?? '').replace(/\D/g, '');
  return s.length === 11 || s.length === 14 ? s : null;
}

const MONTH_MAP: Record<string, string> = {
  janeiro: '01', fevereiro: '02', março: '03', marco: '03',
  abril: '04', maio: '05', junho: '06', julho: '07',
  agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12',
};

function parseStartCompetence(v: unknown): { startComp: string | null; opening: boolean; missing: boolean } {
  const s = String(v ?? '').trim();

  if (!s) return { startComp: null, opening: false, missing: true };

  // Formato legado: MM/AAAA
  if (/^(0[1-9]|1[0-2])\/\d{4}$/.test(s)) {
    return { startComp: s, opening: false, missing: false };
  }

  // Detecta flag de abertura
  const isOpening = /\(abertura\)/i.test(s);
  const cleaned   = s.replace(/\s*\(abertura\)\s*/i, '').trim();

  // Formato novo: NomeMes_AAAA (ex: Janeiro_2022, Outubro_2024)
  const match = cleaned.match(/^([a-záàãâéêíóôõúüç]+)_(\d{4})$/i);
  if (match) {
    const monthKey = match[1].toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    const year     = match[2];
    // tenta com e sem acento
    const monthNum = MONTH_MAP[match[1].toLowerCase()] ?? MONTH_MAP[monthKey];
    if (monthNum) return { startComp: `${monthNum}/${year}`, opening: isOpening, missing: false };
  }

  return { startComp: null, opening: false, missing: false };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'Arquivo não enviado', success: false }, { status: 400 });

    const arrayBuffer = await file.arrayBuffer();
    const wb = new ExcelJS.Workbook();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await wb.xlsx.load(arrayBuffer as any);

    const ws = wb.getWorksheet('Importar') ?? wb.worksheets[0];
    if (!ws) return NextResponse.json({ error: 'Planilha "Importar" não encontrada', success: false }, { status: 400 });

    // Load reference maps + all accounting years to find active and previous
    const [levels, taxRegimesList, professionals, accountingYears] = await Promise.all([
      prisma.level.findMany({ where: { active: true } }),
      prisma.taxRegime.findMany({ where: { active: true } }),
      prisma.professional.findMany({ where: { active: true } }),
      prisma.accountingYear.findMany({ orderBy: { year: 'desc' } }),
    ]);

    const activeYear = accountingYears.find((y) => y.active) ?? accountingYears[0] ?? null;
    const prevYear   = activeYear ? (accountingYears.find((y) => y.year === activeYear.year - 1) ?? null) : null;

    const levelMap = new Map(levels.map((l) => [l.name.trim().toLowerCase(), l.id]));
    const taxMap   = new Map(taxRegimesList.map((t) => [t.name.trim().toLowerCase(), t.id]));
    const profMap  = new Map(professionals.map((p) => [p.name.trim().toLowerCase(), p.id]));

    const results: { row: number; status: 'ok' | 'error'; name: string; error?: string; warning?: string; action?: 'created' | 'updated' }[] = [];

    // Row 1=title, 2=instructions, 3=headers, 4=example (skip if matches)
    for (let r = 4; r <= ws.rowCount; r++) {
      const row = ws.getRow(r);
      const get = (col: number) => {
        const v = row.getCell(col).value;
        if (v === null || v === undefined) return '';
        if (typeof v === 'object' && 'richText' in (v as object)) {
          return (v as ExcelJS.CellRichTextValue).richText.map((rt) => rt.text).join('');
        }
        return String(v).trim();
      };

      const corporateName = get(1);
      if (!corporateName || corporateName === 'Empresa Exemplo LTDA') continue;

      // Columns — note: col 10 is Tributação Ano Anterior (added), all subsequent shifted +1
      const document       = cleanDoc(get(2));
      const code           = get(3) || null;
      const groupName      = get(4) || null;
      const companyType    = ['MATRIZ','FILIAL'].includes(get(5).toUpperCase()) ? get(5).toUpperCase() : null;
      const unit           = get(6) || null;
      const { startComp, opening, missing } = parseStartCompetence(get(7));
      const levelName      = get(8).toLowerCase();
      const taxName        = get(9).toLowerCase();
      const taxNamePrev    = get(10).toLowerCase();
      const opService      = parseBool(get(11));
      const opCommerce     = parseBool(get(12));
      const opIndustry     = parseBool(get(13));
      const irRent         = parseBool(get(14));
      const financialResp  = get(15).toLowerCase();
      const dpResp         = get(16).toLowerCase();
      const fiscalResp     = get(17).toLowerCase();
      const analysisResp   = get(18).toLowerCase();
      const reviewResp     = get(19).toLowerCase();
      const irRentResp     = get(20).toLowerCase();
      const mitResp        = get(21).toLowerCase();
      const cell           = get(22) || null;
      const openingDate    = get(23) || null;
      const terminated     = parseBool(get(24));
      const terminationMonth = get(25) || null;

      const levelId              = levelMap.get(levelName) ?? null;
      const financialResponsibleId = profMap.get(financialResp) ?? null;
      const dpResponsibleId        = profMap.get(dpResp)        ?? null;
      const fiscalResponsibleId    = profMap.get(fiscalResp)     ?? null;
      const analysisResponsibleId  = profMap.get(analysisResp)   ?? null;
      const reviewResponsibleId    = profMap.get(reviewResp)     ?? null;
      const irRentResponsibleId    = profMap.get(irRentResp)     ?? null;
      const mitResponsibleId       = profMap.get(mitResp)        ?? null;

      const taxRegimes: { accountingYearId: number; taxRegimeId: number }[] = [];
      if (activeYear && taxMap.has(taxName)) {
        taxRegimes.push({ accountingYearId: activeYear.id, taxRegimeId: taxMap.get(taxName)! });
      }
      if (prevYear && taxMap.has(taxNamePrev)) {
        taxRegimes.push({ accountingYearId: prevYear.id, taxRegimeId: taxMap.get(taxNamePrev)! });
      }

      try {
        const payload = {
          corporateName,
          document,
          code,
          groupName,
          companyType,
          unit,
          startCompetence: startComp,
          openingCompany: opening,
          openingDate,
          levelId,
          operationService:  opService,
          operationCommerce: opCommerce,
          operationIndustry: opIndustry,
          irRent,
          financialResponsibleId,
          dpResponsibleId,
          fiscalResponsibleId,
          analysisResponsibleId,
          reviewResponsibleId,
          irRentResponsibleId,
          mitResponsibleId,
          cell,
          terminated,
          terminationMonth,
          taxRegimes,
        };

        // Se já existe uma empresa cadastrada com este código, sobrepõe a configuração
        // existente em vez de criar um cadastro duplicado.
        const existing = code ? await prisma.company.findFirst({ where: { code }, select: { id: true } }) : null;
        if (existing) {
          await updateCompany(existing.id, payload);
        } else {
          await createCompany(payload);
        }

        const warning = missing ? 'Início de competência não informado — preencha manualmente no cadastro.' : undefined;
        results.push({ row: r, status: 'ok', name: corporateName, warning, action: existing ? 'updated' : 'created' });
      } catch (e: unknown) {
        results.push({ row: r, status: 'error', name: corporateName, error: e instanceof Error ? e.message : 'Erro desconhecido' });
      }
    }

    const created  = results.filter((r) => r.status === 'ok' && r.action === 'created').length;
    const updated  = results.filter((r) => r.status === 'ok' && r.action === 'updated').length;
    const errors   = results.filter((r) => r.status === 'error').length;
    const warnings = results.filter((r) => r.status === 'ok' && r.warning).length;

    return NextResponse.json({ data: { created, updated, errors, warnings, results }, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao processar planilha';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
