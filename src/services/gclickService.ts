import prisma from '@/lib/prisma';
import { chunk } from '@/lib/utils';
import { logProc } from '@/lib/procLog';

export interface ParsedGClickRow {
  sourceKey: string;
  status: string;
  department: string;
  subject: string;
  competence: string;
  competenceSort: number | null;
  clientCode: string | null;
  clientName: string;
  clientStatus: string | null;
  action: string | null;
  goal: string | null;
  dueDate: Date | null;
  dueDateRaw: string | null;
}

export async function listGClickTasks() {
  return prisma.gClickTask.findMany({ orderBy: [{ subject: 'asc' }, { clientName: 'asc' }] });
}

export async function hasGClickTasks(): Promise<boolean> {
  const count = await prisma.gClickTask.count();
  return count > 0;
}

// Upsert por sourceKey — reimportar não duplica nem apaga o progresso de
// conclusão já marcado localmente para tarefas que continuam existindo na
// nova planilha. Tarefas que já não aparecem mais na planilha são mantidas
// (o usuário limpa manualmente via "Limpar Importação" quando quiser um
// recomeço total).
export async function importGClickTasks(rows: ParsedGClickRow[]): Promise<{ created: number; updated: number }> {
  if (rows.length === 0) return { created: 0, updated: 0 };
  const start = Date.now();

  // Deduplica por sourceKey (a planilha pode repetir a mesma tarefa) — a última
  // ocorrência vence, evitando dois upserts do mesmo unique dentro de uma mesma
  // transação e tornando a contagem created/updated exata.
  const byKey = new Map<string, ParsedGClickRow>();
  for (const r of rows) byKey.set(r.sourceKey, r);
  const deduped = Array.from(byKey.values());
  const keys = deduped.map((r) => r.sourceKey);

  // Uma única consulta (em blocos, para não estourar o tamanho do IN) resolve
  // quais sourceKeys já existem — substitui os N findUnique sequenciais.
  const existingKeys = new Set<string>();
  for (const kc of chunk(keys, 1000)) {
    const found = await prisma.gClickTask.findMany({
      where: { sourceKey: { in: kc } },
      select: { sourceKey: true },
    });
    for (const f of found) existingKeys.add(f.sourceKey);
  }

  const toData = (row: ParsedGClickRow) => ({
    status: row.status,
    department: row.department,
    subject: row.subject,
    competence: row.competence,
    competenceSort: row.competenceSort,
    clientCode: row.clientCode,
    clientName: row.clientName,
    clientStatus: row.clientStatus,
    action: row.action,
    goal: row.goal,
    dueDate: row.dueDate,
    dueDateRaw: row.dueDateRaw,
  });

  // Grava em lotes de 500 dentro de uma transação por lote (compatível com o
  // transaction-pooling do pgbouncer): poucas idas ao banco em vez de milhares.
  const CHUNK_SIZE = 500;
  let processed = 0;
  const chunks = chunk(deduped, CHUNK_SIZE);
  for (const c of chunks) {
    await prisma.$transaction(
      c.map((row) =>
        prisma.gClickTask.upsert({
          where: { sourceKey: row.sourceKey },
          create: { sourceKey: row.sourceKey, ...toData(row) },
          update: toData(row),
        }),
      ),
    );
    processed += c.length;
    logProc({ etapa: 'gclick_import_chunk', registros: c.length, metadata: { processed, total: deduped.length } });
  }

  let created = 0;
  let updated = 0;
  for (const r of deduped) { if (existingKeys.has(r.sourceKey)) updated++; else created++; }

  logProc({ etapa: 'gclick_import', registros: deduped.length, durationMs: Date.now() - start, metadata: { created, updated, chunks: chunks.length } });
  return { created, updated };
}

export async function completeSubject(subject: string, completedBy?: string | null) {
  const result = await prisma.gClickTask.updateMany({
    where: { subject, completed: false },
    data: { completed: true, completedAt: new Date(), completedBy: completedBy ?? null },
  });
  return result.count;
}

export async function completeClient(
  subject: string,
  clientCode: string | null,
  clientName: string,
  completedBy?: string | null
) {
  const where = clientCode
    ? { subject, clientCode, completed: false }
    : { subject, clientName, clientCode: null, completed: false };
  const result = await prisma.gClickTask.updateMany({
    where,
    data: { completed: true, completedAt: new Date(), completedBy: completedBy ?? null },
  });
  return result.count;
}

export async function completeTask(id: number, completed: boolean, completedBy?: string | null) {
  return prisma.gClickTask.update({
    where: { id },
    data: {
      completed,
      completedAt: completed ? new Date() : null,
      completedBy: completed ? (completedBy ?? null) : null,
    },
  });
}

export async function clearAllGClickTasks() {
  await prisma.gClickTask.deleteMany({});
}
