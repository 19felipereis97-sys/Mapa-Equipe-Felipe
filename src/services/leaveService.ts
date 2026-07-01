import prisma from '@/lib/prisma';

export interface LeaveInput {
  professionalId: number;
  startDate: string; // YYYY-MM-DD
  endDate: string;   // YYYY-MM-DD
  description?: string | null;
}

export async function listLeavesByMonth(year: number, month: number) {
  const monthStr = String(month).padStart(2, '0');
  const firstDay = `${year}-${monthStr}-01`;
  const lastDay  = new Date(year, month, 0).toISOString().split('T')[0];

  return prisma.leave.findMany({
    where: {
      AND: [
        { startDate: { lte: lastDay } },
        { endDate:   { gte: firstDay } },
      ],
    },
    include: { professional: { select: { id: true, name: true, teamId: true } } },
    orderBy: [{ startDate: 'asc' }, { professionalId: 'asc' }],
  });
}

export async function listLeavesByProfessional(professionalId: number) {
  return prisma.leave.findMany({
    where: { professionalId },
    orderBy: { startDate: 'desc' },
  });
}

export async function createLeave(data: LeaveInput) {
  return prisma.leave.create({ data });
}

export async function updateLeave(id: number, data: Partial<LeaveInput>) {
  return prisma.leave.update({ where: { id }, data });
}

export async function deleteLeave(id: number) {
  return prisma.leave.delete({ where: { id } });
}
