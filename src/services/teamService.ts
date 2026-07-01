import prisma from '@/lib/prisma';

export async function getTeams(activeOnly = false) {
  return prisma.team.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: 'asc' },
  });
}

export async function createTeam(name: string) {
  const trimmed = name.trim();
  const existing = await prisma.team.findFirst({ where: { name: trimmed } });
  if (existing) throw new Error('Já existe uma equipe com este nome.');
  return prisma.team.create({ data: { name: trimmed } });
}

export async function updateTeam(id: number, name: string) {
  const trimmed = name.trim();
  const existing = await prisma.team.findFirst({ where: { name: trimmed, NOT: { id } } });
  if (existing) throw new Error('Já existe uma equipe com este nome.');
  return prisma.team.update({ where: { id }, data: { name: trimmed } });
}

export async function deleteTeam(id: number) {
  return prisma.team.delete({ where: { id } });
}
