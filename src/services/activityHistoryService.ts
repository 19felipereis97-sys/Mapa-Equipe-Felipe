import prisma from '@/lib/prisma';

export interface HistoryFilters {
  obligationId?: number;
  year?: number;
  month?: number;    // 0 = annual, 1-12 = monthly
  responsibleId?: number;
  newStatus?: string;
  dateStart?: string;
  dateEnd?: string;
  limit?: number;
  offset?: number;
}

export async function listHistoryByCompany(companyId: number, filters: HistoryFilters = {}) {
  const {
    obligationId, year, month, responsibleId, newStatus,
    dateStart, dateEnd,
    limit = 50, offset = 0,
  } = filters;

  const safeLimit = Math.min(limit, 100);

  const where: Record<string, unknown> = { companyId };
  if (obligationId)   where.obligationId   = obligationId;
  if (year != null)   where.year           = year;
  if (month != null)  where.month          = month;
  if (responsibleId)  where.responsibleId  = responsibleId;
  if (newStatus)      where.newStatus      = newStatus;
  if (dateStart || dateEnd) {
    where.createdAt = {
      ...(dateStart ? { gte: new Date(dateStart) } : {}),
      ...(dateEnd   ? { lte: new Date(dateEnd)   } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.activityStatusHistory.findMany({
      where,
      include: {
        obligation:  { select: { id: true, code: true, name: true } },
        responsible: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
      take:   safeLimit,
      skip:   offset,
    }),
    prisma.activityStatusHistory.count({ where }),
  ]);

  return { items, total };
}

export async function countHistoryByCompany(companyId: number) {
  return prisma.activityStatusHistory.count({ where: { companyId } });
}

export async function getHistoryItem(id: number) {
  return prisma.activityStatusHistory.findUnique({
    where: { id },
    include: {
      obligation:  { select: { id: true, code: true, name: true } },
      responsible: { select: { id: true, name: true } },
    },
  });
}
