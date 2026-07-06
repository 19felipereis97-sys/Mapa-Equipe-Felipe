import { NextRequest, NextResponse } from 'next/server';
import { readSnapshot, isRecomputePending, enqueueIndicatorRecompute } from '@/services/indicatorService';
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

    // Leitura normal: serve o snapshot já processado (uma query indexada, sem
    // rodar o motor). O request NUNCA roda o motor — nem no cold-miss: quando
    // não há snapshot, enfileira o recálculo e responde "pendente"; o
    // IndicatorsAgent processa em ~1-2s e a tela preenche via polling.
    const snap = await readSnapshot(month, year);
    if (snap) {
      const pending = await isRecomputePending(month, year);
      return NextResponse.json({
        data: snap.payload,
        success: true,
        meta: { source: 'snapshot', pending, updatedAt: snap.updatedAt },
      });
    }

    await enqueueIndicatorRecompute(month, year, 'cold-miss');
    return NextResponse.json({ data: null, success: true, meta: { source: 'pending', pending: true } });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao carregar dashboard';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
