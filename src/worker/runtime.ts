import type { TarefaProcessamento } from '@prisma/client';
import { handlers, concurrencyFor } from '@/worker/registry';
import {
  claimNextTask, completeTask, failTask, appendLog, createTask, PRIORITY,
} from '@/services/taskService';
import prisma from '@/lib/prisma';

/* ─────────────────────────────────────────────────────────────────────────────
   Worker in-process (single container). Iniciado por src/instrumentation.ts no
   boot do servidor Node. Faz polling da fila, reserva tarefas com FOR UPDATE
   SKIP LOCKED (via taskService.claimNextTask) e despacha para os agents,
   respeitando o limite de concorrência por tipo.

   Não vira processo separado nem exige Redis — cabe no plano de infra atual.
   Para desligar (ex.: rodar um worker dedicado no futuro): WORKER_ENABLED=false.
──────────────────────────────────────────────────────────────────────────── */

const POLL_MS = Number(process.env.WORKER_POLL_MS ?? 1500);
const CLEANUP_INTERVAL_MS = 24 * 60 * 60 * 1000; // 1×/dia

let started = false;
const inflight: Record<string, number> = {};

function log(msg: string, extra?: Record<string, unknown>) {
  console.log(JSON.stringify({ ts: new Date().toISOString(), scope: 'worker', msg, ...extra }));
}

async function runTask(task: TarefaProcessamento): Promise<void> {
  const handler = handlers[task.tipo];
  if (!handler) {
    await failTask(task.id, new Error(`Sem handler para tipo ${task.tipo}`), { etapa: 'dispatch' });
    return;
  }
  const start = Date.now();
  try {
    const res = await handler(task);
    await appendLog(task.id, task.tipo, {
      durationMs: Date.now() - start,
      registrosProcessados: res.registros ?? null,
      mensagem: res.mensagemUsuario ?? 'ok',
    });
    await completeTask(task.id, {
      status: res.status,
      resultRef: res.resultRef ?? null,
      registrosProcessados: res.registros ?? null,
      mensagemUsuario: res.mensagemUsuario ?? null,
    });
    log('task ok', { id: task.id, tipo: task.tipo, durationMs: Date.now() - start });
  } catch (e: unknown) {
    const { retried } = await failTask(task.id, e, { etapa: task.tipo });
    log('task erro', { id: task.id, tipo: task.tipo, retried, erro: e instanceof Error ? e.message : String(e) });
  }
}

const WORKER_ID = `w-${process.pid}`;

async function tick(): Promise<void> {
  try {
    // Só pede tarefas de tipos com vaga livre — isso aplica a concorrência.
    const available = Object.keys(handlers).filter((t) => (inflight[t] ?? 0) < concurrencyFor(t));
    if (available.length === 0) return;

    const task = await claimNextTask(WORKER_ID, available);
    if (!task) return;

    inflight[task.tipo] = (inflight[task.tipo] ?? 0) + 1;
    void runTask(task).finally(() => {
      inflight[task.tipo] = Math.max(0, (inflight[task.tipo] ?? 1) - 1);
      setImmediate(() => { void tick(); }); // liberou vaga → tenta pegar a próxima
    });

    // Ainda pode haver vaga em outros tipos — tenta encadear.
    setImmediate(() => { void tick(); });
  } catch (e: unknown) {
    log('tick erro', { erro: e instanceof Error ? e.message : String(e) });
  }
}

async function scheduleCleanup(): Promise<void> {
  try {
    const pending = await prisma.tarefaProcessamento.count({
      where: { tipo: 'CLEANUP', status: { in: ['AGUARDANDO', 'PROCESSANDO'] } },
    });
    if (pending === 0) {
      await createTask({ tipo: 'CLEANUP', prioridade: PRIORITY.BAIXA, mensagemUsuario: 'Limpeza agendada' });
    }
  } catch (e: unknown) {
    log('cleanup schedule erro', { erro: e instanceof Error ? e.message : String(e) });
  }
}

export function startWorker(): void {
  if (started) return;
  if (process.env.WORKER_ENABLED === 'false') { log('desabilitado (WORKER_ENABLED=false)'); return; }
  started = true;
  log('iniciado', { workerId: WORKER_ID, pollMs: POLL_MS, tipos: Object.keys(handlers) });

  setInterval(() => { void tick(); }, POLL_MS);
  // Limpeza: uma no boot (após 1 min) e depois 1×/dia.
  setTimeout(() => { void scheduleCleanup(); }, 60_000);
  setInterval(() => { void scheduleCleanup(); }, CLEANUP_INTERVAL_MS);
}
