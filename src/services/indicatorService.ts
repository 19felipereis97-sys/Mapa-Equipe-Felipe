import { Prisma } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getDashboardSummary, type DashboardSummary } from '@/services/dashboardService';
import { createTask, PRIORITY } from '@/services/taskService';

/* ─────────────────────────────────────────────────────────────────────────────
   Indicadores do dashboard — snapshot persistido (P3).
   Leituras servem do snapshot (uma query indexada), sem rodar o motor. O recálculo
   é event-driven: mudanças de status enfileiram uma tarefa INDICATORS (deduplicada),
   processada pelo IndicatorsAgent, que sobrescreve o snapshot.
──────────────────────────────────────────────────────────────────────────── */

export function dashboardKey(year: number, month: number): string {
  return `dashboard:${year}:${month}`;
}

/** Recalcula e grava o snapshot. Usado pelo agent e no cold-miss do request. */
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

/** Já existe uma tarefa de recálculo pendente/rodando para este período? */
export async function isRecomputePending(month: number, year: number): Promise<boolean> {
  const count = await prisma.tarefaProcessamento.count({
    where: {
      tipo: 'INDICATORS',
      status: { in: ['AGUARDANDO', 'PROCESSANDO'] },
      AND: [
        { params: { path: ['month'], equals: month } },
        { params: { path: ['year'], equals: year } },
      ],
    },
  });
  return count > 0;
}

/* Enfileira um recálculo, deduplicando: se já há um pendente para o mesmo período,
   não cria outro (é o "debounce por coalescência" pedido no plano). */
export async function enqueueIndicatorRecompute(month: number, year: number, reason: string) {
  if (month < 1 || month > 12) return null; // dashboard só cobre meses 1-12
  if (await isRecomputePending(month, year)) return null;
  return createTask({
    tipo: 'INDICATORS',
    prioridade: PRIORITY.BAIXA,
    params: { month, year, reason },
    mensagemUsuario: 'Recalculando indicadores',
  });
}

/* Fire-and-forget: chamado após gravações de status. Não deve atrasar nem
   derrubar o request do usuário (servidor Node persistente — a promise conclui
   no event loop). */
export function scheduleIndicatorRecompute(month: number, year: number, reason: string): void {
  enqueueIndicatorRecompute(month, year, reason).catch(() => { /* não crítico */ });
}
