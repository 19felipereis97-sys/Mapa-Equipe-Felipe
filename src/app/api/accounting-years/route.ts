import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/accountingYearService';

export async function GET() {
  try {
    const data = await svc.getAccountingYears();
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar anos contábeis', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const year = Number(body.year);
    if (!year || isNaN(year)) {
      return NextResponse.json({ error: 'Ano inválido', success: false }, { status: 400 });
    }
    const data = await svc.createAccountingYear(year);
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar ano contábil';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
