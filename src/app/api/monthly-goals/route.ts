import { NextRequest, NextResponse } from 'next/server';
import { listMonthlyGoals, createMonthlyGoal } from '@/services/goalService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()), 10);
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10);
    const data = await listMonthlyGoals(month, year);
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
    const data = await createMonthlyGoal(body);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro', success: false }, { status: 400 });
  }
}
