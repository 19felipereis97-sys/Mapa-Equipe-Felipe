import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { getEligibleCompaniesForObligation } from './obligationRulesService';
import { ANNUAL_OBLIGATIONS } from '@/types/rules';
import type { EligibleCompanyResult } from '@/types/rules';

/* ─── Constants ─── */
const MONTHS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

export const OBLIGATION_LABELS: Record<string, string> = {
  dp:             'DP',
  fiscal_simples: 'Fiscal Simples',
  fiscal_icms:    'Fiscal ICMS',
  fiscal_servico: 'Fiscal Serviço',
  financeiro:     'Financeiro',
  analise:        'Análise',
  revisao:        'Revisão',
  distribuicao_lucros: 'Distribuição de Lucros',
  ir_aluguel:     'IR Aluguel',
  mit:            'MIT',
  cotas_irpj_csll: 'Cotas IRPJ/CSLL',
  sped_ecd:       'SPED ECD',
  sped_ecf:       'SPED ECF',
};

export const ALL_OBLIGATIONS = [
  'dp','fiscal_simples','fiscal_icms','fiscal_servico',
  'financeiro','analise','revisao','distribuicao_lucros',
  'ir_aluguel','mit','cotas_irpj_csll',
  'sped_ecd','sped_ecf',
];

/* ─── Style helpers ─── */
const NAVY: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } };
const EVEN: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFAFAFA' } };
const BLOCKED: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } };
const WHITE: ExcelJS.Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFFFFF' } };

const BORDER_STYLE: Partial<ExcelJS.Border> = { style: 'thin', color: { argb: 'FFE2E8F0' } };
const ALL_BORDERS: Partial<ExcelJS.Borders> = {
  top: BORDER_STYLE, left: BORDER_STYLE, bottom: BORDER_STYLE, right: BORDER_STYLE,
};

const STATUS_FILLS: Record<string, { fill: string; font: string }> = {
  'OK':         { fill: 'FFDCFCE7', font: 'FF166534' },
  'S/M':        { fill: 'FFDBEAFE', font: 'FF1D4ED8' },
  'P':          { fill: 'FFFEE2E2', font: 'FF991B1B' },
  'ST-I':       { fill: 'FFFFEDD5', font: 'FF9A3412' },
  'ST-C':       { fill: 'FFEDE9FE', font: 'FF5B21B6' },
  'PREJUIZO':   { fill: 'FFE2E8F0', font: 'FF334155' },
  'COTA_UNICA': { fill: 'FFCCFBF1', font: 'FF0F766E' },
};

/* ─── Fetch statuses for an obligation+year ─── */
async function fetchStatuses(obligationCode: string, year: number) {
  const obl = await prisma.obligation.findUnique({ where: { code: obligationCode } });
  if (!obl) return [];
  return prisma.activityStatus.findMany({ where: { obligationId: obl.id, year } });
}

/* ─── Apply header style ─── */
function styleHeader(row: ExcelJS.Row) {
  row.height = 22;
  row.eachCell((cell) => {
    cell.fill = NAVY;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 10, name: 'Calibri' };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: false };
    cell.border = ALL_BORDERS;
  });
}

/* ─── Apply data row style ─── */
function styleDataRow(
  row: ExcelJS.Row,
  isEven: boolean,
  monthStartCol: number,
  company: EligibleCompanyResult,
  statusMap: Map<string, { status: string; observation: string | null }>,
  isTerminated: boolean,
) {
  row.height = 18;
  const identityCols = monthStartCol - 1;

  row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    cell.border = ALL_BORDERS;
    cell.font = { size: 10, name: 'Calibri' };
    if (colNumber <= identityCols) {
      cell.alignment = { vertical: 'middle', horizontal: 'left' };
      cell.fill = isEven ? EVEN : WHITE;
    } else {
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      const monthIdx = colNumber - monthStartCol;
      if (monthIdx >= 0 && monthIdx < 12) {
        const monthInfo = company.months[monthIdx];
        const stKey = `${company.companyId}_${monthIdx + 1}`;
        const st = statusMap.get(stKey);

        if (monthInfo?.blocked) {
          cell.fill = BLOCKED;
          cell.font = { size: 10, color: { argb: 'FF94A3B8' }, italic: true, name: 'Calibri' };
        } else if (st?.status && STATUS_FILLS[st.status]) {
          const colors = STATUS_FILLS[st.status];
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.fill } };
          cell.font = { size: 10, bold: true, color: { argb: colors.font }, name: 'Calibri' };
        } else {
          cell.fill = isEven ? EVEN : WHITE;
        }
      } else {
        cell.fill = isEven ? EVEN : WHITE;
      }
    }
  });
}

/* ─── Build monthly worksheet ─── */
async function buildMonthlyWorksheet(
  wb: ExcelJS.Workbook,
  obligationCode: string,
  year: number,
  onlyTerminated: boolean,
  companies: EligibleCompanyResult[],
  statusMap: Map<string, { status: string; observation: string | null }>,
) {
  const sheetName = OBLIGATION_LABELS[obligationCode] ?? obligationCode;
  const ws = wb.addWorksheet(sheetName);

  const hasTermField = onlyTerminated;
  const monthStartCol = hasTermField ? 7 : 6;

  ws.columns = [
    { width: 10 },  // COD
    { width: 18 },  // Grupo
    { width: 35 },  // Empresa
    { width: 20 },  // Tributação
    { width: 22 },  // Responsável
    ...(hasTermField ? [{ width: 15 }] : []), // Rescindida em
    ...MONTHS.map(() => ({ width: 12 })),
  ];

  const headers = ['COD', 'Grupo', 'Empresa', 'Tributação', 'Responsável'];
  if (hasTermField) headers.push('Rescindida em');
  headers.push(...MONTHS);

  const headerRow = ws.addRow(headers);
  styleHeader(headerRow);

  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const isEven = i % 2 === 1;

    const rowData: (string | number)[] = [
      company.code ?? '',
      company.groupName ?? '',
      company.corporateName,
      company.taxRegime?.name ?? '',
      company.responsible?.name ?? '',
    ];
    if (hasTermField) rowData.push(company.terminationMonth ?? '');

    for (let m = 1; m <= 12; m++) {
      const monthInfo = company.months[m - 1];
      if (monthInfo?.blockReason === 'inicio_competencia') {
        rowData.push('Iníc. competência');
      } else if (monthInfo?.blockReason === 'rescisao') {
        rowData.push('Rescisão');
      } else {
        const st = statusMap.get(`${company.companyId}_${m}`);
        if (st) {
          rowData.push(st.observation ? `${st.status} — ${st.observation}` : st.status);
        } else {
          rowData.push('');
        }
      }
    }

    const row = ws.addRow(rowData);
    styleDataRow(row, isEven, monthStartCol, company, statusMap, onlyTerminated);
  }
}

/* ─── Build annual (SPED) worksheet ─── */
async function buildAnnualWorksheet(
  wb: ExcelJS.Workbook,
  obligationCode: string,
  year: number,
  onlyTerminated: boolean,
  companies: EligibleCompanyResult[],
  statusMap: Map<string, { status: string; observation: string | null }>,
) {
  const sheetName = OBLIGATION_LABELS[obligationCode] ?? obligationCode;
  const ws = wb.addWorksheet(sheetName);
  const hasTermField = onlyTerminated;

  ws.columns = [
    { width: 10 },
    { width: 18 },
    { width: 35 },
    { width: 22 },
    { width: 24 },
    ...(hasTermField ? [{ width: 15 }] : []),
    { width: 14 },
    { width: 30 },
  ];

  const headers = ['COD', 'Grupo', 'Empresa', `Tributação ${year - 1}`, 'Responsável (Análise)'];
  if (hasTermField) headers.push('Rescindida em');
  headers.push(`Status ${year}`, 'Observação');

  const headerRow = ws.addRow(headers);
  styleHeader(headerRow);
  ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'A2' }];

  for (let i = 0; i < companies.length; i++) {
    const company = companies[i];
    const isEven = i % 2 === 1;
    const st = statusMap.get(`${company.companyId}_0`);

    const rowData: (string | number)[] = [
      company.code ?? '',
      company.groupName ?? '',
      company.corporateName,
      company.taxRegime?.name ?? '',
      company.responsible?.name ?? '',
    ];
    if (hasTermField) rowData.push(company.terminationMonth ?? '');
    rowData.push(st?.status ?? '', st?.observation ?? '');

    const row = ws.addRow(rowData);
    row.height = 18;
    const statusColIdx = hasTermField ? 7 : 6;

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      cell.border = ALL_BORDERS;
      cell.font = { size: 10, name: 'Calibri' };
      cell.fill = isEven ? EVEN : WHITE;

      if (colNumber < statusColIdx) {
        cell.alignment = { vertical: 'middle', horizontal: 'left' };
      } else if (colNumber === statusColIdx && st?.status && STATUS_FILLS[st.status]) {
        const colors = STATUS_FILLS[st.status];
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: colors.fill } };
        cell.font = { size: 10, bold: true, color: { argb: colors.font }, name: 'Calibri' };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
      } else {
        cell.alignment = { vertical: 'middle', horizontal: colNumber === statusColIdx ? 'center' : 'left' };
      }
    });
  }
}

/* ─── Main: export single obligation ─── */
export async function exportObligationToBuffer(params: {
  obligationCode: string;
  year: number;
  onlyTerminated: boolean;
}): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const { obligationCode, year, onlyTerminated } = params;

  const companies = await getEligibleCompaniesForObligation({
    obligationCode,
    year,
    onlyTerminated,
    includeTerminated: false,
  });

  const rawStatuses = await fetchStatuses(obligationCode, year);
  const statusMap = new Map<string, { status: string; observation: string | null }>();
  for (const s of rawStatuses) statusMap.set(`${s.companyId}_${s.month}`, s);

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Mapa da Equipe';
  wb.created = new Date();

  const isAnnual = ANNUAL_OBLIGATIONS.includes(obligationCode as typeof ANNUAL_OBLIGATIONS[number]);

  if (isAnnual) {
    await buildAnnualWorksheet(wb, obligationCode, year, onlyTerminated, companies, statusMap);
  } else {
    await buildMonthlyWorksheet(wb, obligationCode, year, onlyTerminated, companies, statusMap);
  }

  const buffer = (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
  const prefix = onlyTerminated ? 'rescindidas_' : '';
  const label = obligationCode.replace(/_/g, '_');
  const filename = `${prefix}${label}_${year}.xlsx`;
  return { buffer, filename };
}

/* ─── Main: export all obligations (annual complete) ─── */
export async function exportAllObligationsToBuffer(params: {
  year: number;
  onlyTerminated: boolean;
}): Promise<{ buffer: ArrayBuffer; filename: string }> {
  const { year, onlyTerminated } = params;

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Mapa da Equipe';
  wb.created = new Date();

  for (const code of ALL_OBLIGATIONS) {
    const companies = await getEligibleCompaniesForObligation({
      obligationCode: code,
      year,
      onlyTerminated,
      includeTerminated: false,
    });

    const rawStatuses = await fetchStatuses(code, year);
    const statusMap = new Map<string, { status: string; observation: string | null }>();
    for (const s of rawStatuses) statusMap.set(`${s.companyId}_${s.month}`, s);

    const isAnnual = ANNUAL_OBLIGATIONS.includes(code as typeof ANNUAL_OBLIGATIONS[number]);

    if (isAnnual) {
      await buildAnnualWorksheet(wb, code, year, onlyTerminated, companies, statusMap);
    } else {
      await buildMonthlyWorksheet(wb, code, year, onlyTerminated, companies, statusMap);
    }
  }

  const buffer = (await wb.xlsx.writeBuffer()) as unknown as ArrayBuffer;
  const prefix = onlyTerminated ? 'rescindidas_' : 'atividades_';
  const filename = `${prefix}completo_${year}.xlsx`;
  return { buffer, filename };
}
