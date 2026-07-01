import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';

const HEADERS = [
  { key: 'corporateName',   label: 'Razão Social *',                       width: 40 },
  { key: 'document',        label: 'CNPJ / CPF',                            width: 22 },
  { key: 'code',            label: 'Código',                                width: 12 },
  { key: 'groupName',       label: 'Grupo',                                 width: 20 },
  { key: 'companyType',     label: 'Tipo (MATRIZ/FILIAL)',                  width: 18 },
  { key: 'unit',            label: 'Unidade',                               width: 14 },
  { key: 'startCompetence', label: 'Início Competência',                    width: 28 },
  { key: 'levelName',       label: 'Nível',                                 width: 18 },
  { key: 'taxRegime',       label: 'Tributação Ano Atual',                  width: 28 },
  { key: 'taxRegimePrev',   label: 'Tributação Ano Anterior',               width: 28 },
  { key: 'opService',       label: 'Serviço (Sim/Não)',                     width: 16 },
  { key: 'opCommerce',      label: 'Comércio (Sim/Não)',                    width: 16 },
  { key: 'opIndustry',      label: 'Indústria (Sim/Não)',                   width: 16 },
  { key: 'irRent',          label: 'IR Aluguel (Sim/Não)',                  width: 18 },
  { key: 'financialResp',   label: 'Resp. Financeiro',                      width: 24 },
  { key: 'dpResp',          label: 'Resp. DP',                              width: 24 },
  { key: 'fiscalResp',      label: 'Resp. Fiscal',                          width: 24 },
  { key: 'analysisResp',    label: 'Resp. Análise',                         width: 24 },
  { key: 'reviewResp',      label: 'Resp. Revisão',                         width: 24 },
  { key: 'irRentResp',      label: 'Resp. IR Aluguel',                      width: 24 },
  { key: 'mitResp',         label: 'Resp. MIT',                             width: 24 },
  { key: 'cell',            label: 'Célula',                                width: 18 },
];

// Column indices (1-based) for data validation
const COL = {
  tipo:        5,
  nivel:       8,
  tribAtual:   9,
  tribAnterior:10,
  simNao:      [11, 12, 13, 14] as number[],
  resps:       [15, 16, 17, 18, 19, 20, 21] as number[],
  celula:      22,
};

function applyRefHeader(ws: ExcelJS.Worksheet, rowNum: number, ...titles: string[]) {
  const row = ws.getRow(rowNum);
  titles.forEach((t, i) => {
    const cell = row.getCell(i + 1);
    cell.value = t;
    cell.font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
    cell.alignment = { horizontal: 'center' };
  });
  row.height = 20;
}

export async function GET() {
  try {
    const [levels, taxRegimes, professionals, activeYear, teams] = await Promise.all([
      prisma.level.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.taxRegime.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.professional.findMany({ where: { active: true }, orderBy: { name: 'asc' } }),
      prisma.accountingYear.findFirst({ where: { active: true } }),
      prisma.team.findMany({ orderBy: { name: 'asc' } }),
    ]);

    const wb = new ExcelJS.Workbook();
    wb.creator = 'Mapa da Equipe';

    // ── Sheet 1: Importar ──────────────────────────────────────────────────────
    const ws = wb.addWorksheet('Importar');
    const lastCol = String.fromCharCode(64 + HEADERS.length + 1); // one extra for visual margin

    // Title row
    ws.mergeCells(`A1:${lastCol}1`);
    const titleCell = ws.getCell('A1');
    titleCell.value = `Modelo de Importação de Empresas — Mapa da Equipe${activeYear ? ` (Ano ativo: ${activeYear.year})` : ''}`;
    titleCell.font = { bold: true, size: 13, color: { argb: 'FF1E3A5F' } };
    titleCell.alignment = { horizontal: 'left', vertical: 'middle' };
    ws.getRow(1).height = 24;

    // Instructions row
    ws.mergeCells(`A2:${lastCol}2`);
    const instrCell = ws.getCell('A2');
    instrCell.value = '* Campo obrigatório. Início Competência: use o formato NomeMes_Ano (ex: Janeiro_2022) ou NomeMes_Ano (Abertura) para empresas de abertura (ex: Outubro_2024 (Abertura)). Deixar em branco gera alerta para preenchimento posterior. Use listas suspensas ou nomes exatos da aba "Referência". A linha 4 é exemplo — apague-a antes de importar.';
    instrCell.font = { size: 9, italic: true, color: { argb: 'FF6B7280' } };
    ws.getRow(2).height = 16;

    // Header row (row 3)
    const headerRow = ws.getRow(3);
    HEADERS.forEach((h, i) => {
      const col  = i + 1;
      const cell = headerRow.getCell(col);
      cell.value = h.label;
      cell.font  = { bold: true, size: 10, color: { argb: 'FFFFFFFF' } };
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E3A5F' } };
      cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      cell.border = {
        bottom: { style: 'medium', color: { argb: 'FF93C5FD' } },
        right:  { style: 'thin',   color: { argb: 'FF3B5FC0' } },
      };
      ws.getColumn(col).width = h.width;
    });
    headerRow.height = 32;

    // Example row (row 4)
    const exRow = ws.getRow(4);
    const exVals = [
      'Empresa Exemplo LTDA',
      '12.345.678/0001-99',
      'EX001',
      'Grupo A',
      'MATRIZ',
      'Principal',
      'Janeiro_2026',
      levels[0]?.name ?? 'Sênior',
      taxRegimes[0]?.name ?? 'Simples Nacional',
      taxRegimes[0]?.name ?? 'Simples Nacional',
      'Não', 'Sim', 'Não', 'Não',
      professionals[0]?.name ?? '', professionals[0]?.name ?? '', professionals[0]?.name ?? '',
      professionals[0]?.name ?? '', professionals[0]?.name ?? '', '', '', '',
    ];
    exVals.forEach((v, i) => {
      const cell = exRow.getCell(i + 1);
      cell.value = v;
      cell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE0F2FE' } };
      cell.font  = { size: 10, italic: true, color: { argb: 'FF374151' } };
    });

    // Data rows 5–54
    for (let r = 5; r <= 54; r++) {
      const row2 = ws.getRow(r);
      for (let c = 1; c <= HEADERS.length; c++) {
        const cell = row2.getCell(c);
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: r % 2 === 0 ? 'FFF9FAFB' : 'FFFFFFFF' } };
        cell.border = { bottom: { style: 'hair', color: { argb: 'FFE5E7EB' } } };
        cell.font  = { size: 10 };
      }
      row2.height = 18;
    }

    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 3 }];

    // ── Data validations (rows 4–54) ──────────────────────────────────────────
    const levelEndRow  = levels.length + 1;
    const taxEndRow    = taxRegimes.length + 1;
    const profEndRow   = professionals.length + 1;
    const teamEndRow   = teams.length > 0 ? teams.length + 1 : null;

    const warnDV = (formulae: string[], errorTitle: string): Partial<ExcelJS.DataValidation> => ({
      type: 'list',
      allowBlank: true,
      formulae,
      showErrorMessage: true,
      errorStyle: 'warning',
      errorTitle,
      error: 'Selecione um valor da lista ou verifique a aba Referência.',
    });

    const silentDV = (formulae: string[]): Partial<ExcelJS.DataValidation> => ({
      type: 'list',
      allowBlank: true,
      formulae,
      showErrorMessage: false,
    });

    for (let r = 4; r <= 54; r++) {
      // Tipo
      ws.getCell(r, COL.tipo).dataValidation = silentDV(['"MATRIZ,FILIAL"']) as ExcelJS.DataValidation;

      // Nível
      ws.getCell(r, COL.nivel).dataValidation = warnDV(
        [`'Referência'!$A$2:$A$${levelEndRow}`], 'Nível inválido'
      ) as ExcelJS.DataValidation;

      // Tributação ano atual
      ws.getCell(r, COL.tribAtual).dataValidation = warnDV(
        [`'Referência'!$B$2:$B$${taxEndRow}`], 'Tributação inválida'
      ) as ExcelJS.DataValidation;

      // Tributação ano anterior
      ws.getCell(r, COL.tribAnterior).dataValidation = warnDV(
        [`'Referência'!$B$2:$B$${taxEndRow}`], 'Tributação inválida'
      ) as ExcelJS.DataValidation;

      // Sim/Não fields
      for (const c of COL.simNao) {
        ws.getCell(r, c).dataValidation = silentDV(['"Sim,Não"']) as ExcelJS.DataValidation;
      }

      // Responsáveis
      for (const c of COL.resps) {
        ws.getCell(r, c).dataValidation = warnDV(
          [`'Referência'!$C$2:$C$${profEndRow}`], 'Profissional inválido'
        ) as ExcelJS.DataValidation;
      }

      // Célula
      if (teamEndRow) {
        ws.getCell(r, COL.celula).dataValidation = silentDV(
          [`'Referência'!$D$2:$D$${teamEndRow}`]
        ) as ExcelJS.DataValidation;
      }
    }

    // ── Sheet 2: Referência ────────────────────────────────────────────────────
    const ref = wb.addWorksheet('Referência');
    ref.getColumn(1).width = 30;
    ref.getColumn(2).width = 35;
    ref.getColumn(3).width = 35;
    ref.getColumn(4).width = 30;

    let rn = 1;
    applyRefHeader(ref, rn++, 'Níveis disponíveis', 'Tributações disponíveis', 'Profissionais ativos', 'Equipes (Célula)');
    const maxRows = Math.max(levels.length, taxRegimes.length, professionals.length, teams.length);
    for (let i = 0; i < maxRows; i++) {
      const row3 = ref.getRow(rn++);
      if (levels[i])        row3.getCell(1).value = levels[i].name;
      if (taxRegimes[i])    row3.getCell(2).value = taxRegimes[i].name;
      if (professionals[i]) row3.getCell(3).value = professionals[i].name;
      if (teams[i])         row3.getCell(4).value = teams[i].name;
      row3.height = 16;
    }

    rn++;
    applyRefHeader(ref, rn++, 'Valores válidos para Tipo');
    ref.getRow(rn++).getCell(1).value = 'MATRIZ';
    ref.getRow(rn++).getCell(1).value = 'FILIAL';
    ref.getRow(rn++).getCell(1).value = '(deixar em branco = sem tipo)';

    rn++;
    applyRefHeader(ref, rn++, 'Valores para colunas Sim/Não');
    ref.getRow(rn++).getCell(1).value = 'Sim';
    ref.getRow(rn++).getCell(1).value = 'Não';

    rn++;
    applyRefHeader(ref, rn++, 'Formato — Início Competência');
    ref.getRow(rn++).getCell(1).value = 'Janeiro_2022  →  01/2022';
    ref.getRow(rn++).getCell(1).value = 'Outubro_2024 (Abertura)  →  10/2024 + flag abertura';
    ref.getRow(rn++).getCell(1).value = '(em branco)  →  importa com alerta';
    ref.getRow(rn++).getCell(1).value = 'Meses: Janeiro, Fevereiro, Março, Abril,';
    ref.getRow(rn++).getCell(1).value = 'Maio, Junho, Julho, Agosto, Setembro,';
    ref.getRow(rn++).getCell(1).value = 'Outubro, Novembro, Dezembro';

    const buf = await wb.xlsx.writeBuffer();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return new NextResponse(buf as any, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="modelo_importacao_empresas.xlsx"',
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao gerar template';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
