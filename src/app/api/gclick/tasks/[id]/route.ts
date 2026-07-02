import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/gclickService';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    if (typeof body.completed !== 'boolean') {
      return NextResponse.json({ error: '"completed" é obrigatório', success: false }, { status: 400 });
    }
    const data = await svc.completeTask(id, body.completed);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao atualizar tarefa';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
