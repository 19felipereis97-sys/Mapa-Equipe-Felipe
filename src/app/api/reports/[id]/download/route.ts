import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import prisma from '@/lib/prisma';
import { getStorage } from '@/lib/storage';
import { requirePermission } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

/* GET /api/reports/:id/download — streama o relatório já gerado, do storage.
   O arquivo nunca é exposto direto: passa por esta rota autenticada. */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('reports');
  if (!guard.ok) return guard.response;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'id inválido', success: false }, { status: 400 });

  const relatorio = await prisma.relatorioGerado.findUnique({ where: { id } });
  if (!relatorio || !relatorio.storagePath) {
    return NextResponse.json({ error: 'Relatório não encontrado', success: false }, { status: 404 });
  }
  if (relatorio.status !== 'CONCLUIDO') {
    return NextResponse.json({ error: 'Relatório ainda não está pronto', success: false }, { status: 409 });
  }
  if (relatorio.expiresAt && relatorio.expiresAt < new Date()) {
    return NextResponse.json({ error: 'Relatório expirado — gere novamente', success: false }, { status: 410 });
  }

  let data: Buffer;
  try {
    data = await getStorage().get(relatorio.storagePath);
  } catch {
    return NextResponse.json({ error: 'Arquivo indisponível no storage', success: false }, { status: 404 });
  }

  const filename = path.basename(relatorio.storagePath).replace(/^\d+_/, '');
  const isXlsx = filename.toLowerCase().endsWith('.xlsx');
  const contentType = isXlsx
    ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    : 'application/octet-stream';

  return new NextResponse(data as unknown as BodyInit, {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': String(data.length),
    },
  });
}
