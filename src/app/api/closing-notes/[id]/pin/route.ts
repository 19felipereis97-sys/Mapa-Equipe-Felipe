import { NextRequest, NextResponse } from 'next/server';
import { togglePinned } from '@/services/closingNoteService';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await togglePinned(Number(params.id));
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao fixar anotação', success: false }, { status: 400 });
  }
}
