import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/accountingYearService';

export async function PUT(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const data = await svc.setActiveAccountingYear(id);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao ativar ano contábil';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
