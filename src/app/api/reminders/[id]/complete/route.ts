import { NextRequest, NextResponse } from 'next/server';
import { completeReminder, reopenReminder } from '@/services/reminderService';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const body = await req.json().catch(() => ({}));
    const data = body.completed === false
      ? await reopenReminder(Number(params.id))
      : await completeReminder(Number(params.id));
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao atualizar lembrete', success: false }, { status: 400 });
  }
}
