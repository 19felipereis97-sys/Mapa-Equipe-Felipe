import prisma from '@/lib/prisma';

export async function getObligations(activeOnly = false) {
  return prisma.obligation.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: { deadline: true },
    orderBy: { order: 'asc' },
  });
}
