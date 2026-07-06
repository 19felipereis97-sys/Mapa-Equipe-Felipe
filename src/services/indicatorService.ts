import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getDashboardSummary, type DashboardSummary } from '@/services/dashboardService';

/* ─────────────────────────────────────────────────────────────────────────────
   Indicadores do dashboard — snapshot persistido (P3), modelo SERVERLESS (Vercel).

   Leituras servem do snapshot (uma query indexada). Se não houver snapshot, o
   próprio request calcula uma vez (inline) e persiste. Na escrita de status o
   snapshot é INVALIDADO (apagado) de forma síncrona — a próxima leitura
   recalcula. Sem worker de fundo (que não roda em serverless).
──────────────────────────────────────────────────────────────────────────── */

export function dashboardKey(year: number, month: number): string {
  return `dashboard:${year}:${month}`;
}

/** Recalcula e grava o snapshot. Chamado no cold-miss/stale do request. */
export async function computeAndStoreIndicators(
  month: number,
  year: number,
  reason: string,
): Promise<{ payload: DashboardSummary; registros: number }> {
  const payload = await getDashboardSummary(month, year);
  const chave = dashboardKey(year, month);
  const json = payload as unknown as Prisma.InputJsonValue;

  await prisma.indicadorProcessado.upsert({
    where: { chave },
    create: { chave, ano: year, mes: month, payload: json, recalculationReason: reason },
    update: { payload: json, recalculationReason: reason },
  });

  return { payload, registros: payload.totalEligible };
}

export async function readSnapshot(month: number, year: number) {
  return prisma.indicadorProcessado.findUnique({ where: { chave: dashboardKey(year, month) } });
}

/** Serve do snapshot; se não existir, calcula inline e persiste. */
export async function getIndicators(month: number, year: number): Promise<DashboardSummary> {
  const snap = await readSnapshot(month, year);
  if (snap) return snap.payload as unknown as DashboardSummary;
  const { payload } = await computeAndStoreIndicators(month, year, 'cold-miss');
  return payload;
}

/* Invalida o snapshot do período (apaga) — próxima leitura recalcula. Síncrono
   e barato (uma query), compatível com serverless. Chamado após gravar status. */
export async function invalidateIndicatorSnapshot(month: number, year: number): Promise<void> {
  if (month < 1 || month > 12) return;
  try {
    await prisma.indicadorProcessado.deleteMany({ where: { chave: dashboardKey(year, month) } });
  } catch { /* não crítico */ }
}
