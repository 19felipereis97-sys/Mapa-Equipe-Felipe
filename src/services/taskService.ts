import prisma from '@/lib/prisma';
import { Prisma, type TarefaProcessamento, type TaskStatus } from '@prisma/client';

/* ─────────────────────────────────────────────────────────────────────────────
   DAL da fila de processamento (worker loop Postgres).
   Fase 2: camada de acesso + reserva atômica de tarefas. Os agents/worker que
   consomem isto chegam na Fase 3. Nada aqui roda em request pesado — apenas
   cria tarefas, reserva, marca status e registra logs/erros.
──────────────────────────────────────────────────────────────────────────── */

// Prioridade: menor = mais urgente (usado no ORDER BY do claim).
export const PRIORITY = { ALTA: 10, NORMAL: 100, BAIXA: 1000 } as const;

const RETRY_BASE_MS = 30_000; // backoff exponencial: 30s, 60s, 120s…

export async function createTask(input: {
  tipo: string;
  params?: Prisma.InputJsonValue;
  prioridade?: number;
  userId?: number | null;
  mensagemUsuario?: string | null;
  maxTentativas?: number;
}): Promise<TarefaProcessamento> {
  return prisma.tarefaProcessamento.create({
    data: {
      tipo: input.tipo,
      params: input.params ?? Prisma.JsonNull,
      prioridade: input.prioridade ?? PRIORITY.NORMAL,
      userId: input.userId ?? null,
      mensagemUsuario: input.mensagemUsuario ?? 'Aguardando processamento',
      maxTentativas: input.maxTentativas ?? 3,
    },
  });
}

/* ─── Reserva atômica da próxima tarefa executável ────────────────────────────
   FOR UPDATE SKIP LOCKED permite vários workers concorrentes sem pegarem a mesma
   tarefa. Respeita proximaTentativaEm (backoff) e prioridade. Marca PROCESSANDO,
   incrementa tentativas e registra lock. Opcionalmente filtra por tipos (para
   ter workers dedicados a filas específicas: import / reports / indicators).
──────────────────────────────────────────────────────────────────────────── */
export async function claimNextTask(workerId: string, tipos?: string[]): Promise<TarefaProcessamento | null> {
  const tipoFilter = tipos && tipos.length > 0
    ? Prisma.sql`AND tipo IN (${Prisma.join(tipos)})`
    : Prisma.empty;

  const rows = await prisma.$queryRaw<TarefaProcessamento[]>`
    UPDATE tarefas_processamento AS t
    SET status = 'PROCESSANDO',
        "lockedBy" = ${workerId},
        "lockedAt" = now(),
        "startedAt" = COALESCE(t."startedAt", now()),
        tentativas = t.tentativas + 1,
        "updatedAt" = now()
    WHERE t.id = (
      SELECT id FROM tarefas_processamento
      WHERE status = 'AGUARDANDO'
        AND ("proximaTentativaEm" IS NULL OR "proximaTentativaEm" <= now())
        ${tipoFilter}
      ORDER BY prioridade ASC, "createdAt" ASC
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    RETURNING t.*;
  `;
  return rows[0] ?? null;
}

/* ─── Conclusão ─── */
export async function completeTask(
  taskId: number,
  opts?: { status?: Extract<TaskStatus, 'CONCLUIDO' | 'CONCLUIDO_COM_ALERTAS' | 'PENDENTE_REVISAO'>; resultRef?: string | null; registrosProcessados?: number | null; mensagemUsuario?: string | null },
): Promise<void> {
  const task = await prisma.tarefaProcessamento.findUnique({ where: { id: taskId }, select: { startedAt: true } });
  const durationMs = task?.startedAt ? Date.now() - task.startedAt.getTime() : null;
  await prisma.tarefaProcessamento.update({
    where: { id: taskId },
    data: {
      status: opts?.status ?? 'CONCLUIDO',
      resultRef: opts?.resultRef ?? undefined,
      registrosProcessados: opts?.registrosProcessados ?? undefined,
      mensagemUsuario: opts?.mensagemUsuario ?? 'Concluído',
      finishedAt: new Date(),
      durationMs,
      lockedBy: null,
      lockedAt: null,
    },
  });
}

/* ─── Falha (decide retry × falha definitiva) ─────────────────────────────────
   Se ainda há tentativas, volta para AGUARDANDO com proximaTentativaEm (backoff).
   Esgotadas as tentativas, marca ERRO (definitivo) e grava em erros_processamento.
──────────────────────────────────────────────────────────────────────────── */
export async function failTask(
  taskId: number,
  error: unknown,
  opts?: { etapa?: string; metadata?: Prisma.InputJsonValue },
): Promise<{ retried: boolean }> {
  const erroResumo = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? error.stack : undefined;

  const task = await prisma.tarefaProcessamento.findUnique({
    where: { id: taskId },
    select: { tentativas: true, maxTentativas: true, startedAt: true },
  });
  if (!task) return { retried: false };

  const canRetry = task.tentativas < task.maxTentativas;

  if (canRetry) {
    const delay = RETRY_BASE_MS * Math.pow(2, Math.max(0, task.tentativas - 1));
    await prisma.tarefaProcessamento.update({
      where: { id: taskId },
      data: {
        status: 'AGUARDANDO',
        proximaTentativaEm: new Date(Date.now() + delay),
        erroResumo,
        lockedBy: null,
        lockedAt: null,
        mensagemUsuario: 'Falhou — nova tentativa agendada',
      },
    });
  } else {
    const durationMs = task.startedAt ? Date.now() - task.startedAt.getTime() : null;
    await prisma.tarefaProcessamento.update({
      where: { id: taskId },
      data: {
        status: 'ERRO',
        erroResumo,
        erroDetalhado: stack ?? null,
        finishedAt: new Date(),
        durationMs,
        lockedBy: null,
        lockedAt: null,
        mensagemUsuario: 'Erro no processamento',
      },
    });
  }

  await appendError(taskId, opts?.etapa ?? 'unknown', erroResumo, { stack, metadata: opts?.metadata });
  return { retried: canRetry };
}

export async function cancelTask(taskId: number): Promise<void> {
  await prisma.tarefaProcessamento.update({
    where: { id: taskId },
    data: { status: 'CANCELADO', finishedAt: new Date(), lockedBy: null, lockedAt: null, mensagemUsuario: 'Cancelado' },
  });
}

/* ─── Requeue de uma tarefa em erro (reprocessar) ─── */
export async function requeueTask(taskId: number): Promise<void> {
  await prisma.tarefaProcessamento.update({
    where: { id: taskId },
    data: {
      status: 'AGUARDANDO',
      tentativas: 0,
      proximaTentativaEm: null,
      erroResumo: null,
      erroDetalhado: null,
      startedAt: null,
      finishedAt: null,
      durationMs: null,
      lockedBy: null,
      lockedAt: null,
      mensagemUsuario: 'Reenfileirado para reprocessamento',
    },
  });
}

/* ─── Observabilidade ─── */
export async function appendLog(
  taskId: number | null,
  etapa: string,
  data?: { mensagem?: string | null; durationMs?: number | null; registrosProcessados?: number | null; metadata?: Prisma.InputJsonValue },
): Promise<void> {
  await prisma.logProcessamento.create({
    data: {
      taskId: taskId ?? undefined,
      etapa,
      mensagem: data?.mensagem ?? undefined,
      durationMs: data?.durationMs ?? undefined,
      registrosProcessados: data?.registrosProcessados ?? undefined,
      metadata: data?.metadata ?? Prisma.JsonNull,
    },
  });
}

export async function appendError(
  taskId: number | null,
  etapa: string,
  erroResumo: string,
  data?: { erroDetalhado?: string | null; stack?: string | null; metadata?: Prisma.InputJsonValue },
): Promise<void> {
  await prisma.erroProcessamento.create({
    data: {
      taskId: taskId ?? undefined,
      etapa,
      erroResumo,
      erroDetalhado: data?.erroDetalhado ?? undefined,
      stack: data?.stack ?? undefined,
      metadata: data?.metadata ?? Prisma.JsonNull,
    },
  });
}

/* ─── Consulta de status (usado pela UI para acompanhar a tarefa) ─── */
export async function getTask(taskId: number): Promise<TarefaProcessamento | null> {
  return prisma.tarefaProcessamento.findUnique({ where: { id: taskId } });
}
