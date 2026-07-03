import type { TaskHandler } from '@/worker/registry';
import { computeAndStoreIndicators, dashboardKey } from '@/services/indicatorService';

/* IndicatorsAgent — recalcula o snapshot do dashboard e grava em
   indicadores_processados. Concorrência 1 (ver registry). */
export const indicatorsAgent: TaskHandler = async (task) => {
  const params = (task.params ?? {}) as { month?: number; year?: number; reason?: string };
  const month = Number(params.month);
  const year = Number(params.year);
  if (!month || !year) throw new Error('INDICATORS: params.month/year ausentes');

  const { registros } = await computeAndStoreIndicators(month, year, params.reason ?? `task:${task.id}`);
  return {
    registros,
    resultRef: dashboardKey(year, month),
    mensagemUsuario: 'Indicadores atualizados',
  };
};
