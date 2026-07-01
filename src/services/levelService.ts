import prisma from '@/lib/prisma';

export async function getLevels(activeOnly = false) {
  return prisma.level.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: 'asc' },
  });
}

export async function createLevel(name: string, color?: string | null) {
  const trimmed = name.trim();
  const existing = await prisma.level.findFirst({ where: { name: trimmed } });
  if (existing) throw new Error('Já existe um nível com este nome.');
  return prisma.level.create({ data: { name: trimmed, color: color || null } });
}

export async function updateLevel(id: number, name: string, color?: string | null) {
  const trimmed = name.trim();
  const existing = await prisma.level.findFirst({ where: { name: trimmed, NOT: { id } } });
  if (existing) throw new Error('Já existe um nível com este nome.');
  return prisma.level.update({ where: { id }, data: { name: trimmed, color: color || null } });
}

export async function deleteLevel(id: number) {
  return prisma.level.delete({ where: { id } });
}
