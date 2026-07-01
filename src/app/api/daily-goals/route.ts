import { NextRequest, NextResponse } from 'next/server';
import { listDailyGoals, createDailyGoal } from '@/services/goalService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];
    const data = await listDailyGoals(date);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title?.trim()) {
      return NextResponse.json({ error: 'Título é obrigatório', success: false }, { status: 400 });
    }
    if (!body.date) {
      return NextResponse.json({ error: 'Data é obrigatória', success: false }, { status: 400 });
    }
    const data = await createDailyGoal(body);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro', success: false }, { status: 400 });
  }
}
