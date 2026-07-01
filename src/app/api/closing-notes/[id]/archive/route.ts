import { NextRequest, NextResponse } from 'next/server';
import { archiveClosingNote, unarchiveClosingNote } from '@/services/closingNoteService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = body.archived === false
      ? await unarchiveClosingNote(Number(params.id))
      : await archiveClosingNote(Number(params.id));
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao arquivar anotação', success: false }, { status: 400 });
  }
}
