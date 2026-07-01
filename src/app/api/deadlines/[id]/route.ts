import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/deadlineService';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    const dueDay = body.dueDay !== undefined ? Number(body.dueDay) : undefined;
    const startDay = body.startDay !== undefined ? (body.startDay ? Number(body.startDay) : null) : undefined;
    if (dueDay !== undefined && (dueDay < 1 || dueDay > 31)) {
      return NextResponse.json({ error: 'Prazo final deve ser entre 1 e 31', success: false }, { status: 400 });
    }
    if (startDay !== null && startDay !== undefined && (startDay < 1 || startDay > 31)) {
      return NextResponse.json({ error: 'Início deve ser entre 1 e 31', success: false }, { status: 400 });
    }
    const data = await svc.updateDeadline(id, { startDay, dueDay, active: body.active });
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao atualizar prazo';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await svc.deleteDeadline(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao excluir prazo';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
