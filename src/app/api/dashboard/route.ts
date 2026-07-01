import { NextRequest, NextResponse } from 'next/server';
import { getDashboardSummary } from '@/services/dashboardService';

export async function GET(req: NextRequest) {
  try {
    const url   = new URL(req.url);
    const month = Number(url.searchParams.get('month') ?? new Date().getMonth() + 1);
    const year  = Number(url.searchParams.get('year')  ?? new Date().getFullYear());

    if (month < 1 || month > 12)       return NextResponse.json({ error: 'Mês inválido (1-12)',  success: false }, { status: 400 });
    if (year  < 2000 || year > 2100)   return NextResponse.json({ error: 'Ano inválido',          success: false }, { status: 400 });

    const data = await getDashboardSummary(month, year);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao calcular dashboard';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
