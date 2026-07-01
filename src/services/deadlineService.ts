import prisma from '@/lib/prisma';

export async function getDeadlines() {
  return prisma.deadline.findMany({
    include: { obligation: true },
    orderBy: { obligation: { order: 'asc' } },
  });
}

export async function createDeadline(data: {
  obligationId: number;
  startDay?: number | null;
  dueDay: number;
}) {
  const existing = await prisma.deadline.findFirst({ where: { obligationId: data.obligationId } });
  if (existing) throw new Error('Já existe um prazo para esta obrigação.');
  return prisma.deadline.create({
    data: {
      obligationId: data.obligationId,
      startDay: data.startDay ?? null,
      dueDay: data.dueDay,
      active: true,
    },
    include: { obligation: true },
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
    include: { obligation: true },
  });
}

export async function deleteDeadline(id: number) {
  return prisma.deadline.delete({ where: { id } });
}
