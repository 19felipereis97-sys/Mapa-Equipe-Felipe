import { NextRequest, NextResponse } from 'next/server';
import { getIndicators } from '@/services/indicatorService';
import { requirePermission } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const guard = await requirePermission('view_dashboard');
    if (!guard.ok) return guard.response;

    const url   = new URL(req.url);
    const month = Number(url.searchParams.get('month') ?? new Date().getMonth() + 1);
    const year  = Number(url.searchParams.get('year')  ?? new Date().getFullYear());

    if (month < 1 || month > 12)     return NextResponse.json({ error: 'Mês inválido (1-12)', success: false }, { status: 400 });
    if (year  < 2000 || year > 2100) return NextResponse.json({ error: 'Ano inválido',         success: false }, { status: 400 });

    // Serve do snapshot; no cold-miss calcula inline uma vez e persiste. O
    // snapshot é invalidado (apagado) quando um status muda, então normalmente
    // as aberturas leem o snapshot pronto e só a 1ª após uma alteração recalcula.
    const data = await getIndicators(month, year);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao carregar dashboard';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
