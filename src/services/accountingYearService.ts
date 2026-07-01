import prisma from '@/lib/prisma';

export async function getAccountingYears() {
  return prisma.accountingYear.findMany({ orderBy: { year: 'desc' } });
}

export async function getActiveAccountingYear() {
  return prisma.accountingYear.findFirst({ where: { active: true } });
}

export async function createAccountingYear(year: number) {
  if (year < 2024 || year > 2100) throw new Error('Ano deve estar entre 2024 e 2100.');
  const existing = await prisma.accountingYear.findUnique({ where: { year } });
  if (existing) throw new Error('Este ano já está cadastrado.');
  const count = await prisma.accountingYear.count();
  return prisma.accountingYear.create({ data: { year, active: count === 0 } });
}

export async function setActiveAccountingYear(id: number) {
  await prisma.accountingYear.updateMany({ data: { active: false } });
  return prisma.accountingYear.update({ where: { id }, data: { active: true } });
}
