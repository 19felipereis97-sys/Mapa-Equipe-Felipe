import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/closingNoteService';

function parseId(id: string) {
  const parsed = Number(id);
  if (!Number.isFinite(parsed)) throw new Error('ID inválido');
  return parsed;
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await svc.updateClosingNote(parseId(params.id), await req.json());
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao atualizar anotação', success: false }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await svc.deleteClosingNote(parseId(params.id));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao excluir anotação', success: false }, { status: 400 });
  }
}
