import { NextRequest, NextResponse } from 'next/server';
import { listLeavesByMonth, createLeave } from '@/services/leaveService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const year  = parseInt(searchParams.get('year')  ?? String(new Date().getFullYear()), 10);
    const month = parseInt(searchParams.get('month') ?? String(new Date().getMonth() + 1), 10);
    const data = await listLeavesByMonth(year, month);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { professionalId, startDate, endDate, description } = body;
    if (!professionalId || !startDate || !endDate) {
      return NextResponse.json({ error: 'professionalId, startDate e endDate são obrigatórios', success: false }, { status: 400 });
    }
    const data = await createLeave({ professionalId, startDate, endDate, description });
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro', success: false }, { status: 400 });
  }
}
