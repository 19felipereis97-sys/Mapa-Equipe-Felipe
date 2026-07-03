import { NextResponse } from 'next/server';
import * as svc from '@/services/gclickService';
import { requirePermission } from '@/lib/authGuard';

export async function GET() {
  try {
    const data = await svc.listGClickTasks();
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tarefas', success: false }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const guard = await requirePermission('clear_data');
    if (!guard.ok) return guard.response;

    await svc.clearAllGClickTasks();
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao limpar importação';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
