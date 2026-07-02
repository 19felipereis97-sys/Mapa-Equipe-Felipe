import ExcelJS from 'exceljs';
import type { ParsedGClickRow } from '@/services/gclickService';

/* ─── Colunas esperadas na planilha do G-Click ─── */
const EXPECTED_COLUMNS = [
  { key: 'status', label: 'Status' },
  { key: 'department', label: 'Departamento' },
  { key: 'subject', label: 'Assunto' },
  { key: 'competence', label: 'Competência' },
  { key: 'client', label: 'Cliente' },
  { key: 'clientStatus', label: 'Status Cliente' },
  { key: 'action', label: 'Ação' },
  { key: 'goal', label: 'Meta' },
  { key: 'dueDate', label: 'Vencimento' },
] as const;

type ColumnKey = typeof EXPECTED_COLUMNS[number]['key'];

const MONTH_ABBR_MAP: Record<string, number> = {
  jan: 1, fev: 2, mar: 3, abr: 4, mai: 5, jun: 6,
  jul: 7, ago: 8, set: 9, out: 10, nov: 11, dez: 12,
};

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .trim()
    .toLowerCase()
    .replace(/[.:_-]/g, ' ') // pontuação comum entre palavras vira espaço
    .replace(/\s+/g, ' ')
    .trim();
}

// Palavras significativas de um rótulo, para o pareamento por aproximação
// (ex.: aceita "Status do Cliente" ou "Cliente - Status" para "Status Cliente").
function significantWords(label: string): string[] {
  const STOPWORDS = new Set(['de', 'do', 'da', 'dos', 'das', 'e']);
  return normalize(label).split(' ').filter((w) => w && !STOPWORDS.has(w));
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  // Campos de texto livre (Ação, Meta, Status) às vezes vêm como data nativa do
  // Excel — grava só a data (sem hora/timezone) para não poluir a tela nem
  // deixar o sourceKey instável entre reimportações do mesmo arquivo.
  if (value instanceof Date) {
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  if (typeof value === 'object' && 'richText' in (value as object)) {
    return (value as ExcelJS.CellRichTextValue).richText.map((rt) => rt.text).join('');
  }
  if (typeof value === 'object' && 'text' in (value as object)) {
    return String((value as { text: unknown }).text ?? '');
  }
  return String(value).trim();
}

/* ─── Competência: "JAN/2026", "Janeiro/2026" ou "01/2026" ─── */
function parseCompetence(raw: string): number | null {
  const s = normalize(raw).replace(/\s+/g, '');
  const abbrMatch = s.match(/^([a-z]{3})[a-z]*[/\-.]?(\d{4})$/);
  if (abbrMatch) {
    const month = MONTH_ABBR_MAP[abbrMatch[1]];
    const year = parseInt(abbrMatch[2], 10);
    if (month) return year * 12 + month;
  }
  const numericMatch = s.match(/^(\d{1,2})[/\-.](\d{4})$/);
  if (numericMatch) {
    const month = parseInt(numericMatch[1], 10);
    const year = parseInt(numericMatch[2], 10);
    if (month >= 1 && month <= 12) return year * 12 + month;
  }
  return null;
}

/* ─── Vencimento: Date do Excel, "DD/MM/AAAA" ou "AAAA-MM-DD" ─── */
function parseDueDate(value: ExcelJS.CellValue): { date: Date | null; raw: string | null } {
  if (value === null || value === undefined || value === '') return { date: null, raw: null };
  if (value instanceof Date && !isNaN(value.getTime())) {
    return { date: value, raw: null };
  }
  const raw = cellText(value);
  if (!raw) return { date: null, raw: null };

  const br = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (br) {
    const [, d, m, y] = br;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return { date, raw };
  }
  const iso = raw.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    const [, y, m, d] = iso;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    if (!isNaN(date.getTime())) return { date, raw };
  }
  return { date: null, raw };
}

/* ─── "0001 - CLIENTE EXEMPLO LTDA" → código + nome; sem código reconhecível → nome inteiro ─── */
function parseClient(raw: string): { code: string | null; name: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^(\d{2,10})\s*[-–—]\s*(.+)$/);
  if (match) return { code: match[1], name: match[2].trim() };
  return { code: null, name: trimmed };
}

export interface GClickParseResult {
  rows: ParsedGClickRow[];
  missingColumns: string[];
  detectedHeaders: string[];
  totalDataRows: number;
  skippedEmptyRows: number;
}

export async function parseGClickWorkbook(buffer: ArrayBuffer): Promise<GClickParseResult> {
  const wb = new ExcelJS.Workbook();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await wb.xlsx.load(buffer as any);
  const ws = wb.worksheets[0];
  if (!ws) {
    return { rows: [], missingColumns: EXPECTED_COLUMNS.map((c) => c.label), detectedHeaders: [], totalDataRows: 0, skippedEmptyRows: 0 };
  }

  // Encontra a linha de cabeçalho — normalmente a primeira, mas tolera até 5
  // linhas de título/instrução antes dela, caso a exportação do G-Click mude.
  // Pareamento em duas passadas: (1) texto igual ao esperado, (2) aproximado —
  // cabeçalho que contenha todas as palavras do rótulo esperado, em qualquer
  // ordem, tolerando variações como "Status do Cliente" ou "Cliente/Status".
  let headerRowNum = 1;
  let columnIndex: Partial<Record<ColumnKey, number>> = {};
  let detectedHeaders: string[] = [];

  for (let r = 1; r <= Math.min(5, ws.rowCount); r++) {
    const row = ws.getRow(r);
    const cells: { text: string; colNumber: number }[] = [];
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell.value);
      if (text) cells.push({ text, colNumber });
    });
    if (cells.length === 0) continue;

    const map: Partial<Record<ColumnKey, number>> = {};
    const claimed = new Set<number>();

    // Passada 1 — correspondência exata
    for (const { text, colNumber } of cells) {
      const normalized = normalize(text);
      const found = EXPECTED_COLUMNS.find((c) => normalize(c.label) === normalized);
      if (found && map[found.key] === undefined) {
        map[found.key] = colNumber;
        claimed.add(colNumber);
      }
    }

    // Passada 2 — aproximada, só para colunas ainda não encontradas
    for (const col of EXPECTED_COLUMNS) {
      if (map[col.key] !== undefined) continue;
      const words = significantWords(col.label);
      const match = cells.find(({ text, colNumber }) => {
        if (claimed.has(colNumber)) return false;
        const cellWords = new Set(normalize(text).split(' '));
        return words.every((w) => cellWords.has(w));
      });
      if (match) {
        map[col.key] = match.colNumber;
        claimed.add(match.colNumber);
      }
    }

    if (Object.keys(map).length >= 5) {
      headerRowNum = r;
      columnIndex = map;
      detectedHeaders = cells.map((c) => c.text);
      break;
    }
  }

  const missingColumns = EXPECTED_COLUMNS
    .filter((c) => columnIndex[c.key] === undefined)
    .map((c) => c.label);

  if (missingColumns.length > 0) {
    return { rows: [], missingColumns, detectedHeaders, totalDataRows: 0, skippedEmptyRows: 0 };
  }

  const rows: ParsedGClickRow[] = [];
  let totalDataRows = 0;
  let skippedEmptyRows = 0;

  for (let r = headerRowNum + 1; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const get = (key: ColumnKey) => cellText(row.getCell(columnIndex[key]!).value).trim();

    const status = get('status');
    const department = get('department');
    const subject = get('subject');
    const competenceRaw = get('competence');
    const clientRaw = get('client');

    if (!status && !department && !subject && !competenceRaw && !clientRaw) {
      continue; // linha totalmente vazia
    }
    totalDataRows++;
    if (!subject || !clientRaw) {
      skippedEmptyRows++;
      continue; // sem assunto ou cliente não dá pra montar a hierarquia
    }

    const clientStatus = get('clientStatus') || null;
    const action = get('action') || null;
    const goal = get('goal') || null;
    const { code: clientCode, name: clientName } = parseClient(clientRaw);
    const competenceSort = parseCompetence(competenceRaw);
    const { date: dueDate, raw: dueDateRaw } = parseDueDate(row.getCell(columnIndex.dueDate!).value);

    const sourceKey = [department, subject, clientRaw, competenceRaw, action ?? '', goal ?? '']
      .map((v) => v.trim().toLowerCase())
      .join('|');

    rows.push({
      sourceKey,
      status: status || '—',
      department: department || '—',
      subject,
      competence: competenceRaw || '—',
      competenceSort,
      clientCode,
      clientName,
      clientStatus,
      action,
      goal,
      dueDate,
      dueDateRaw,
    });
  }

  return { rows, missingColumns: [], detectedHeaders, totalDataRows, skippedEmptyRows };
}
