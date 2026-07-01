import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/levelService';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório', success: false }, { status: 400 });
    }
    const data = await svc.updateLevel(id, body.name, body.color ?? null);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao atualizar nível';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await svc.deleteLevel(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao excluir nível';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
