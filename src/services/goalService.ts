import prisma from '@/lib/prisma';

/* ─── Monthly Goals ─── */

export interface MonthlyGoalInput {
  title: string;
  description?: string | null;
  month: number;
  year: number;
}

export async function listMonthlyGoals(month: number, year: number) {
  return prisma.monthlyGoal.findMany({
    where: { month, year },
    orderBy: [{ completed: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createMonthlyGoal(data: MonthlyGoalInput) {
  return prisma.monthlyGoal.create({ data });
}

export async function updateMonthlyGoal(id: number, data: Partial<MonthlyGoalInput & { completed: boolean }>) {
  const payload: Parameters<typeof prisma.monthlyGoal.update>[0]['data'] = { ...data };
  if (data.completed === true)  payload.completedAt = new Date();
  if (data.completed === false) payload.completedAt = null;
  return prisma.monthlyGoal.update({ where: { id }, data: payload });
}

export async function deleteMonthlyGoal(id: number) {
  return prisma.monthlyGoal.delete({ where: { id } });
}

/* ─── Daily Goals ─── */

export interface DailyGoalInput {
  title: string;
  description?: string | null;
  date: string; // YYYY-MM-DD
}

export async function listDailyGoals(date: string) {
  return prisma.dailyGoal.findMany({
    where: { date },
    orderBy: [{ completed: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function createDailyGoal(data: DailyGoalInput) {
  return prisma.dailyGoal.create({ data });
}

export async function updateDailyGoal(id: number, data: Partial<DailyGoalInput & { completed: boolean }>) {
  const payload: Parameters<typeof prisma.dailyGoal.update>[0]['data'] = { ...data };
  if (data.completed === true)  payload.completedAt = new Date();
  if (data.completed === false) payload.completedAt = null;
  return prisma.dailyGoal.update({ where: { id }, data: payload });
}

export async function deleteDailyGoal(id: number) {
  return prisma.dailyGoal.delete({ where: { id } });
}
