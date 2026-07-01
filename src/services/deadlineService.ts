import prisma from '@/lib/prisma';

// Obligations that support one deadline per tax regime, in addition to (or instead
// of) a general one. Extend this list if another obligation needs the same split.
export const TAX_SPLIT_OBLIGATION_CODES = ['financeiro', 'analise'];

export async function getDeadlines() {
  return prisma.deadline.findMany({
    include: { obligation: true, taxRegime: true },
    orderBy: [{ obligation: { order: 'asc' } }, { taxRegimeId: 'asc' }],
  });
}

export async function createDeadline(data: {
  obligationId: number;
  taxRegimeId?: number | null;
  startDay?: number | null;
  dueDay: number;
}) {
  const taxRegimeId = data.taxRegimeId ?? null;

  if (taxRegimeId !== null) {
    const obligation = await prisma.obligation.findUnique({ where: { id: data.obligationId }, select: { code: true } });
    if (!obligation || !TAX_SPLIT_OBLIGATION_CODES.includes(obligation.code)) {
      throw new Error('Prazo separado por tributação só é permitido para Financeiro e Análise.');
    }
  }

  // Postgres allows multiple NULLs in a unique index, so the "geral" (taxRegimeId
  // null) case needs an explicit duplicate check on top of the DB constraint.
  const existing = await prisma.deadline.findFirst({ where: { obligationId: data.obligationId, taxRegimeId } });
  if (existing) {
    throw new Error(taxRegimeId ? 'Já existe um prazo para esta obrigação com esta tributação.' : 'Já existe um prazo geral para esta obrigação.');
  }

  return prisma.deadline.create({
    data: {
      obligationId: data.obligationId,
      taxRegimeId,
      startDay: data.startDay ?? null,
      dueDay: data.dueDay,
      active: true,
    },
    include: { obligation: true, taxRegime: true },
  });
}

export async function updateDeadline(
  id: number,
  data: { startDay?: number | null; dueDay?: number; active?: boolean }
) {
  return prisma.deadline.update({
    where: { id },
    data: {
      ...(data.startDay !== undefined && { startDay: data.startDay }),
      ...(data.dueDay !== undefined && { dueDay: data.dueDay }),
      ...(data.active !== undefined && { active: data.active }),
    },
    include: { obligation: true, taxRegime: true },
  });
}

export async function deleteDeadline(id: number) {
  return prisma.deadline.delete({ where: { id } });
}
