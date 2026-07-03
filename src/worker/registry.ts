import type { TarefaProcessamento } from '@prisma/client';
import { indicatorsAgent } from '@/worker/agents/indicatorsAgent';
import { cleanupAgent } from '@/worker/agents/cleanupAgent';

/* ─────────────────────────────────────────────────────────────────────────────
   Registro de agents e limites de concorrência por tipo de tarefa.
   O worker (runtime.ts) só reserva tarefas de tipos com vaga livre, o que faz a
   própria fila respeitar o limite de concorrência.
──────────────────────────────────────────────────────────────────────────── */

export interface TaskResult {
  registros?: number | null;
  resultRef?: string | null;
  status?: 'CONCLUIDO' | 'CONCLUIDO_COM_ALERTAS' | 'PENDENTE_REVISAO';
  mensagemUsuario?: string | null;
}

export type TaskHandler = (task: TarefaProcessamento) => Promise<TaskResult>;

// Concorrência máxima simultânea por tipo (plano: import 1, reports 2, indicators 1…).
export const CONCURRENCY: Record<string, number> = {
  INDICATORS: 1,
  CLEANUP: 1,
  // reservados para as próximas fases (encaixam com Storage):
  GCLICK_IMPORT: 1,
  COMPANY_IMPORT: 1,
  CARDS: 1,
  REPORT_PDF: 2,
  REPORT_EXCEL: 2,
};

// Somente os tipos com handler registrado são processados nesta fase.
export const handlers: Record<string, TaskHandler> = {
  INDICATORS: indicatorsAgent,
  CLEANUP: cleanupAgent,
};

export function concurrencyFor(tipo: string): number {
  return CONCURRENCY[tipo] ?? 1;
}
