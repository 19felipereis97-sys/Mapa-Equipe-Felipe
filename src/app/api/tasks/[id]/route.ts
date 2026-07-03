import { NextRequest, NextResponse } from 'next/server';
import { getTask, requeueTask } from '@/services/taskService';
import { requirePermission, getSession } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

/* GET /api/tasks/:id — status de uma tarefa (a UI faz polling disto). */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado', success: false }, { status: 401 });

  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'id inválido', success: false }, { status: 400 });

  const task = await getTask(id);
  if (!task) return NextResponse.json({ error: 'Tarefa não encontrada', success: false }, { status: 404 });

  return NextResponse.json({
    data: {
      id: task.id,
      tipo: task.tipo,
      status: task.status,
      mensagemUsuario: task.mensagemUsuario,
      resultRef: task.resultRef,
      registrosProcessados: task.registrosProcessados,
      erroResumo: task.status === 'ERRO' ? task.erroResumo : null,
      tentativas: task.tentativas,
      createdAt: task.createdAt,
      finishedAt: task.finishedAt,
    },
    success: true,
  });
}

/* POST /api/tasks/:id — reprocessar uma tarefa em erro (reprocess). */
export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('reprocess');
  if (!guard.ok) return guard.response;

  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'id inválido', success: false }, { status: 400 });

  const task = await getTask(id);
  if (!task) return NextResponse.json({ error: 'Tarefa não encontrada', success: false }, { status: 404 });

  await requeueTask(id);
  return NextResponse.json({ success: true });
}
