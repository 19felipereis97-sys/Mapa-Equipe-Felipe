import { NextRequest, NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import prisma from '@/lib/prisma';
import { detectUrgency, createNotifications } from '@/services/portalNotificationService';
import type { PortalNotificationInput } from '@/services/portalNotificationService';

function cleanCnpj(v: unknown): string {
  return String(v ?? '').replace(/\D/g, '');
}

function cellText(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v === null || v === undefined) return '';
  if (typeof v === 'object' && 'richText' in (v as object)) {
    return (v as ExcelJS.CellRichTextValue).richText.map((rt) => rt.text).join('');
  }
  if (typeof v === 'object' && v instanceof Date) {
    return v.toLocaleDateString('pt-BR');
  }
  return String(v).trim();
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

    const ws = wb.worksheets[0];
    if (!ws) return NextResponse.json({ error: 'Planilha não encontrada', success: false }, { status: 400 });

    // Load company CNPJ map: cnpj_digits → companyId
    const companies = await prisma.company.findMany({
      where: { terminated: false, document: { not: null } },
      select: { id: true, document: true },
    });
    const cnpjMap = new Map<string, number>();
    for (const c of companies) {
      if (c.document) {
        const digits = c.document.replace(/\D/g, '');
        if (digits.length === 14) cnpjMap.set(digits, c.id);
      }
    }

    const batchName = file.name;
    const items: PortalNotificationInput[] = [];
    let ignored = 0;

    // Row 1 = header, rows 2+ = data. Columns: 1=CNPJ, 2=Empresa, 3=Data, 4=Assunto
    for (let r = 2; r <= ws.rowCount; r++) {
      const row     = ws.getRow(r);
      const cnpjRaw = cellText(row.getCell(1));
      const empresa = cellText(row.getCell(2));
      const data    = cellText(row.getCell(3));
      const assunto = cellText(row.getCell(4));

      if (!cnpjRaw && !empresa) continue;

      const cnpjDigits = cleanCnpj(cnpjRaw);
      const companyId  = cnpjMap.get(cnpjDigits);

      if (!companyId) { ignored++; continue; }

      items.push({
        companyId,
        cnpj:             cnpjDigits,
        companyName:      empresa,
        notificationDate: data,
        subject:          assunto,
        urgency:          detectUrgency(assunto),
        batchName,
      });
    }

    const { created } = await createNotifications(items);
    return NextResponse.json({ data: { imported: created, ignored }, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao processar arquivo';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
