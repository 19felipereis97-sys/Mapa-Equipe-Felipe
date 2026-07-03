import { NextRequest, NextResponse } from 'next/server';
import { requirePermission } from '@/lib/authGuard';
import { createTask, PRIORITY } from '@/services/taskService';
import { ALL_OBLIGATIONS } from '@/services/excelExportService';

export const dynamic = 'force-dynamic';

/* POST /api/reports/excel — enfileira a geração de um Excel em background.
   Body: { kind: 'excel_single' | 'excel_complete', year, obligation?, onlyTerminated? }
   Retorna { taskId } — a UI acompanha via GET /api/tasks/:id e baixa o
   resultado em GET /api/reports/:relatorioId/download quando concluir. */
export async function POST(req: NextRequest) {
  const guard = await requirePermission('reports');
  if (!guard.ok) return guard.response;

  const body = await req.json().catch(() => ({}));
  const kind = body?.kind === 'excel_complete' ? 'excel_complete' : 'excel_single';
  const year = Number(body?.year);
  const onlyTerminated = !!body?.onlyTerminated;
  const obligation = typeof body?.obligation === 'string' ? body.obligation : undefined;

  if (!year || year < 2000 || year > 2100) {
    return NextResponse.json({ error: 'Ano inválido', success: false }, { status: 400 });
  }
  if (kind === 'excel_single' && (!obligation || !ALL_OBLIGATIONS.includes(obligation))) {
    return NextResponse.json({ error: 'Obrigação inválida', success: false }, { status: 400 });
  }

  const userId = Number(guard.session.user.id);
  const task = await createTask({
    tipo: 'REPORT_EXCEL',
    prioridade: PRIORITY.NORMAL,
    userId: Number.isInteger(userId) ? userId : null,
    mensagemUsuario: 'Gerando relatório…',
    params: { kind, year, obligation: obligation ?? null, onlyTerminated },
  });

  return NextResponse.json({ data: { taskId: task.id }, success: true }, { status: 202 });
}
