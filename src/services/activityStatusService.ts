import prisma from '@/lib/prisma';
import { chunk } from '@/lib/utils';
import { logProc } from '@/lib/procLog';
import { invalidateIndicatorSnapshot } from '@/services/indicatorService';

/* ─── Obligation code → ID resolution ─────────────────────────────────────────
   Cached in-memory: obligations are static reference data (11 rows, managed
   via seed), so resolving the code on every single request/click was adding
   an avoidable extra round-trip to the remote Postgres instance on top of the
   actual query, making tab switches and status edits feel slow.
──────────────────────────────────────────────────────────────────────────── */
const OBLIGATION_ID_CACHE_TTL = 10 * 60 * 1000; // 10 minutes
let obligationIdCache: { map: Map<string, number>; expiresAt: number } | null = null;

async function resolveObligationId(code: string): Promise<number> {
  if (!obligationIdCache || obligationIdCache.expiresAt <= Date.now()) {
    const all = await prisma.obligation.findMany({ select: { id: true, code: true } });
    obligationIdCache = { map: new Map(all.map((o) => [o.code, o.id])), expiresAt: Date.now() + OBLIGATION_ID_CACHE_TTL };
  }
  const id = obligationIdCache.map.get(code);
  if (id === undefined) throw new Error(`Obrigação '${code}' não encontrada. Verifique se as obrigações estão cadastradas em Configurações.`);
  return id;
}

/* ─── List all statuses for a company + year (used for rescission validation) ─── */
export async function listStatusesByCompanyAndYear(companyId: number, year: number) {
  return prisma.activityStatus.findMany({
    where: { companyId, year, month: { gte: 1, lte: 12 } },
    include: { obligation: { select: { code: true, name: true } } },
    orderBy: { month: 'asc' },
  });
}

/* ─── List statuses for obligation + year ─── */
export async function listStatusesByObligationAndYear(
  obligationCode: string,
  year: number,
) {
  const obligationId = await resolveObligationId(obligationCode);
  return prisma.activityStatus.findMany({
    where: { obligationId, year },
    orderBy: [{ companyId: 'asc' }, { month: 'asc' }],
  });
}

/* ─── Get single status ─── */
export async function getActivityStatus(
  companyId: number,
  obligationCode: string,
  year: number,
  month: number,
) {
  const obligationId = await resolveObligationId(obligationCode);
  return prisma.activityStatus.findUnique({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
  });
}

/* ─── Upsert with history ─── */
export async function upsertActivityStatus(data: {
  companyId: number;
  obligationCode: string;
  year: number;
  month: number;
  status: string;
  observation: string | null;
  responsibleId?: number | null;
}) {
  const { companyId, obligationCode, year, month, status, observation, responsibleId = null } = data;
  const obligationId = await resolveObligationId(obligationCode);

  // Get existing to compare
  const existing = await prisma.activityStatus.findUnique({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
  });

  const result = await prisma.activityStatus.upsert({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
    create: { companyId, obligationId, year, month, status, observation, responsibleId },
    update: { status, observation, responsibleId },
  });

  // Write history only when status actually changes
  if (!existing || existing.status !== status) {
    await prisma.activityStatusHistory.create({
      data: {
        companyId,
        obligationId,
        year,
        month,
        previousStatus: existing?.status ?? null,
        newStatus: status,
        observation,
        responsibleId,
      },
    });
  }

  await invalidateIndicatorSnapshot(month, year);
  return result;
}

/* ─── Clear (delete) a status ─── */
export async function clearActivityStatus(
  companyId: number,
  obligationCode: string,
  year: number,
  month: number,
) {
  const obligationId = await resolveObligationId(obligationCode);

  const existing = await prisma.activityStatus.findUnique({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
  });
  if (!existing) return null;

  await prisma.activityStatus.delete({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
  });

  // History: status removed
  await prisma.activityStatusHistory.create({
    data: {
      companyId,
      obligationId,
      year,
      month,
      previousStatus: existing.status,
      newStatus: null,
      observation: null,
      responsibleId: existing.responsibleId,
    },
  });

  await invalidateIndicatorSnapshot(month, year);
  return existing;
}

/* ─── Bulk upsert (transacional, em lotes) ────────────────────────────────────
   Antes: Promise.allSettled sobre N itens, cada um com findUnique + upsert +
   create de histórico = até 3×N queries CONCORRENTES contra o pool do pgbouncer
   (uma seleção "todas as empresas × 12 meses" chegava a milhares, saturando o
   pool e degradando o app inteiro).

   Agora: resolve os IDs de obrigação uma vez, e processa em lotes de 200 dentro
   de UMA transação por lote. Cada lote faz 1 SELECT (status atuais, para saber o
   que mudou), os upserts do lote e 1 createMany de histórico só para os que
   realmente mudaram de status — preservando a regra original de auditoria.
──────────────────────────────────────────────────────────────────────────── */
const BULK_CHUNK_SIZE = 200;

const statusKey = (x: { companyId: number; obligationId: number; year: number; month: number }) =>
  `${x.companyId}:${x.obligationId}:${x.year}:${x.month}`;

export async function bulkUpsertActivityStatus(items: Array<{
  companyId: number;
  obligationCode: string;
  year: number;
  month: number;
  status: string;
  observation: string | null;
  responsibleId?: number | null;
}>) {
  if (items.length === 0) return { succeeded: 0, failed: 0 };
  const start = Date.now();

  // Resolve os IDs de obrigação uma vez (não por item).
  const codes = Array.from(new Set(items.map((i) => i.obligationCode)));
  const idByCode = new Map<string, number>();
  for (const code of codes) idByCode.set(code, await resolveObligationId(code));

  const norm = items.map((i) => ({
    companyId: i.companyId,
    obligationId: idByCode.get(i.obligationCode)!,
    year: i.year,
    month: i.month,
    status: i.status,
    observation: i.observation,
    responsibleId: i.responsibleId ?? null,
  }));

  let succeeded = 0;
  let failed = 0;

  for (const c of chunk(norm, BULK_CHUNK_SIZE)) {
    try {
      // Status atuais do lote — usa o índice único (companyId,obligationId,year,month).
      // Consulta por conjuntos (superset) e casa pela chave exata em memória: uma
      // query indexada em vez de um OR gigante.
      const existing = await prisma.activityStatus.findMany({
        where: {
          companyId: { in: c.map((x) => x.companyId) },
          obligationId: { in: c.map((x) => x.obligationId) },
          year: { in: c.map((x) => x.year) },
          month: { in: c.map((x) => x.month) },
        },
        select: { companyId: true, obligationId: true, year: true, month: true, status: true },
      });
      const prevStatus = new Map(existing.map((e) => [statusKey(e), e.status]));

      const historyData = c
        .filter((x) => prevStatus.get(statusKey(x)) !== x.status)
        .map((x) => ({
          companyId: x.companyId,
          obligationId: x.obligationId,
          year: x.year,
          month: x.month,
          previousStatus: prevStatus.get(statusKey(x)) ?? null,
          newStatus: x.status,
          observation: x.observation,
          responsibleId: x.responsibleId,
        }));

      await prisma.$transaction([
        ...c.map((x) =>
          prisma.activityStatus.upsert({
            where: { companyId_obligationId_year_month: { companyId: x.companyId, obligationId: x.obligationId, year: x.year, month: x.month } },
            create: { companyId: x.companyId, obligationId: x.obligationId, year: x.year, month: x.month, status: x.status, observation: x.observation, responsibleId: x.responsibleId },
            update: { status: x.status, observation: x.observation, responsibleId: x.responsibleId },
          }),
        ),
        prisma.activityStatusHistory.createMany({ data: historyData }),
      ]);
      succeeded += c.length;
    } catch (e: unknown) {
      failed += c.length;
      logProc({ etapa: 'bulk_upsert_chunk_error', registros: c.length, metadata: { error: e instanceof Error ? e.message : String(e) } });
    }
  }

  // Invalida o snapshot uma vez por (ano, mês) distinto tocado.
  for (const key of Array.from(new Set(norm.map((x) => `${x.year}:${x.month}`)))) {
    const [y, m] = key.split(':').map(Number);
    await invalidateIndicatorSnapshot(m, y);
  }

  logProc({ etapa: 'bulk_upsert', registros: items.length, durationMs: Date.now() - start, metadata: { succeeded, failed } });
  return { succeeded, failed };
}

/* ─── Bulk clear (transacional, em lotes) ─── */
export async function bulkClearActivityStatus(items: Array<{
  companyId: number;
  obligationCode: string;
  year: number;
  month: number;
}>) {
  if (items.length === 0) return { succeeded: 0, failed: 0 };
  const start = Date.now();

  const codes = Array.from(new Set(items.map((i) => i.obligationCode)));
  const idByCode = new Map<string, number>();
  for (const code of codes) idByCode.set(code, await resolveObligationId(code));

  const norm = items.map((i) => ({
    companyId: i.companyId,
    obligationId: idByCode.get(i.obligationCode)!,
    year: i.year,
    month: i.month,
  }));

  let succeeded = 0;
  let failed = 0;

  for (const c of chunk(norm, BULK_CHUNK_SIZE)) {
    try {
      const existing = await prisma.activityStatus.findMany({
        where: {
          companyId: { in: c.map((x) => x.companyId) },
          obligationId: { in: c.map((x) => x.obligationId) },
          year: { in: c.map((x) => x.year) },
          month: { in: c.map((x) => x.month) },
        },
        select: { id: true, companyId: true, obligationId: true, year: true, month: true, status: true, responsibleId: true },
      });
      // Só os que casam exatamente com um item do lote.
      const wanted = new Set(c.map(statusKey));
      const toDelete = existing.filter((e) => wanted.has(statusKey(e)));
      if (toDelete.length === 0) { succeeded += c.length; continue; }

      await prisma.$transaction([
        prisma.activityStatus.deleteMany({ where: { id: { in: toDelete.map((e) => e.id) } } }),
        prisma.activityStatusHistory.createMany({
          data: toDelete.map((e) => ({
            companyId: e.companyId,
            obligationId: e.obligationId,
            year: e.year,
            month: e.month,
            previousStatus: e.status,
            newStatus: null,
            observation: null,
            responsibleId: e.responsibleId,
          })),
        }),
      ]);
      succeeded += c.length;
    } catch (e: unknown) {
      failed += c.length;
      logProc({ etapa: 'bulk_clear_chunk_error', registros: c.length, metadata: { error: e instanceof Error ? e.message : String(e) } });
    }
  }

  for (const key of Array.from(new Set(norm.map((x) => `${x.year}:${x.month}`)))) {
    const [y, m] = key.split(':').map(Number);
    await invalidateIndicatorSnapshot(m, y);
  }

  logProc({ etapa: 'bulk_clear', registros: items.length, durationMs: Date.now() - start, metadata: { succeeded, failed } });
  return { succeeded, failed };
}
