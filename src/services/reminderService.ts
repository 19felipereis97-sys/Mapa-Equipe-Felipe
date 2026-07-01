import prisma from '@/lib/prisma';
import type { Prisma } from '@prisma/client';

const INCLUDE = {
  company: true,
} as const;

type ReminderView = 'open' | 'completed' | 'all';

interface ListRemindersParams {
  search?: string | null;
  companyId?: number | null;
  view?: ReminderView;
}

interface ReminderInput {
  companyId?: number | null;
  text?: string | null;
  remindAt?: string | Date | null;
}

function cleanCompanyId(value: number | null | undefined) {
  return value && Number.isFinite(value) ? value : null;
}

function cleanRemindAt(value: string | Date | null | undefined) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error('Data para lembrar inválida');
  return date;
}

function validateText(text: string | null | undefined, partial = false) {
  if (partial && text === undefined) return undefined;
  const cleaned = text?.trim();
  if (!cleaned) throw new Error('Lembrete é obrigatório');
  return cleaned;
}

export async function listReminders(params: ListRemindersParams = {}) {
  const where: Prisma.ReminderWhereInput = {};
  if (params.view === 'completed') where.completed = true;
  else if (params.view !== 'all') where.completed = false;
  if (params.companyId) where.companyId = params.companyId;
  if (params.search?.trim()) {
    const q = params.search.trim();
    where.OR = [
      { text: { contains: q } },
      { company: { corporateName: { contains: q } } },
    ];
  }

  const rows = await prisma.reminder.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ updatedAt: 'desc' }],
  });

  return rows.sort((a, b) => {
    if (a.completed || b.completed) {
      if (a.completed !== b.completed) return a.completed ? 1 : -1;
      return (b.completedAt?.getTime() ?? 0) - (a.completedAt?.getTime() ?? 0);
    }
    if (a.remindAt && b.remindAt) return a.remindAt.getTime() - b.remindAt.getTime();
    if (a.remindAt && !b.remindAt) return -1;
    if (!a.remindAt && b.remindAt) return 1;
    return b.updatedAt.getTime() - a.updatedAt.getTime();
  });
}

export async function createReminder(data: ReminderInput) {
  const text = validateText(data.text);
  return prisma.reminder.create({
    data: {
      companyId: cleanCompanyId(data.companyId),
      text: text!,
      remindAt: cleanRemindAt(data.remindAt),
      completed: false,
      completedAt: null,
    },
    include: INCLUDE,
  });
}

export async function updateReminder(id: number, data: ReminderInput) {
  const text = validateText(data.text, true);
  return prisma.reminder.update({
    where: { id },
    data: {
      ...(data.companyId !== undefined ? { companyId: cleanCompanyId(data.companyId) } : {}),
      ...(text !== undefined ? { text } : {}),
      ...(data.remindAt !== undefined ? { remindAt: cleanRemindAt(data.remindAt) } : {}),
    },
    include: INCLUDE,
  });
}

export async function completeReminder(id: number) {
  return prisma.reminder.update({
    where: { id },
    data: { completed: true, completedAt: new Date() },
    include: INCLUDE,
  });
}

export async function reopenReminder(id: number) {
  return prisma.reminder.update({
    where: { id },
    data: { completed: false, completedAt: null },
    include: INCLUDE,
  });
}

export async function deleteReminder(id: number) {
  await prisma.reminder.delete({ where: { id } });
}
