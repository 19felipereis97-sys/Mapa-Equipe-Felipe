import prisma from '@/lib/prisma';

export async function getProfessionals() {
  return prisma.professional.findMany({
    include: { team: true },
    orderBy: [{ active: 'desc' }, { name: 'asc' }],
  });
}

export async function createProfessional(data: {
  name: string;
  teamId?: number | null;
  email?: string | null;
}) {
  return prisma.professional.create({
    data: {
      name: data.name.trim(),
      teamId: data.teamId ?? null,
      email: data.email?.trim() || null,
      active: true,
    },
    include: { team: true },
  });
}

export async function updateProfessional(
  id: number,
  data: { name?: string; teamId?: number | null; email?: string | null; active?: boolean }
) {
  return prisma.professional.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name.trim() }),
      ...(data.teamId !== undefined && { teamId: data.teamId }),
      ...(data.email !== undefined && { email: data.email?.trim() || null }),
      ...(data.active !== undefined && { active: data.active }),
    },
    include: { team: true },
  });
}

export async function deleteProfessional(id: number) {
  return prisma.professional.delete({ where: { id } });
}
