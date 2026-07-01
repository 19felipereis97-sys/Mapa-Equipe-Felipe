import { NextRequest, NextResponse } from 'next/server';
import { updateMonthlyGoal, deleteMonthlyGoal } from '@/services/goalService';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    const body = await req.json();
    const data = await updateMonthlyGoal(id, body);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro', success: false }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    await deleteMonthlyGoal(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro', success: false }, { status: 400 });
  }
}
