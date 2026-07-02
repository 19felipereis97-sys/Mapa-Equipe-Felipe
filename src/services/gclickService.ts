import prisma from '@/lib/prisma';

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
  let created = 0;
  let updated = 0;

  for (const row of rows) {
    const existing = await prisma.gClickTask.findUnique({ where: { sourceKey: row.sourceKey } });
    await prisma.gClickTask.upsert({
      where: { sourceKey: row.sourceKey },
      create: {
        sourceKey: row.sourceKey,
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
      },
      update: {
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
      },
    });
    if (existing) updated++; else created++;
  }

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
