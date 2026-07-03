import { NextRequest, NextResponse } from 'next/server';
import { exportAllObligationsToBuffer } from '@/services/excelExportService';
import { requirePermission } from '@/lib/authGuard';

export async function GET(req: NextRequest) {
  try {
    const guard = await requirePermission('reports');
    if (!guard.ok) return guard.response;

    const { searchParams } = new URL(req.url);
    const yearParam      = searchParams.get('year');
    const onlyTerminated = searchParams.get('onlyTerminated') === 'true';

    const year = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Ano inválido', success: false }, { status: 400 });
    }

    const { buffer, filename } = await exportAllObligationsToBuffer({ year, onlyTerminated });
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    return new NextResponse(blob, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao gerar Excel completo';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
