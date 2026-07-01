import { NextRequest, NextResponse } from 'next/server';
import { revertTermination } from '@/services/companyService';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id, 10);
    if (isNaN(id)) return NextResponse.json({ error: 'ID inválido', success: false }, { status: 400 });
    const data = await revertTermination(id);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao reverter rescisão';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
