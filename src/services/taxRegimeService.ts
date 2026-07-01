import prisma from '@/lib/prisma';

export async function getTaxRegimes(activeOnly = false) {
  return prisma.taxRegime.findMany({
    where: activeOnly ? { active: true } : undefined,
    orderBy: { name: 'asc' },
  });
}

export async function createTaxRegime(name: string, color?: string | null) {
  const trimmed = name.trim();
  const existing = await prisma.taxRegime.findFirst({ where: { name: trimmed } });
  if (existing) throw new Error('Já existe uma tributação com este nome.');
  return prisma.taxRegime.create({ data: { name: trimmed, color: color ?? null } });
}

export async function updateTaxRegime(id: number, name: string, color?: string | null) {
  const trimmed = name.trim();
  const existing = await prisma.taxRegime.findFirst({ where: { name: trimmed, NOT: { id } } });
  if (existing) throw new Error('Já existe uma tributação com este nome.');
  return prisma.taxRegime.update({ where: { id }, data: { name: trimmed, color: color ?? null } });
}

export async function deleteTaxRegime(id: number) {
  return prisma.taxRegime.delete({ where: { id } });
}

const BRAZIL_DEFAULTS: { name: string; color: string }[] = [
  { name: 'Simples Nacional',       color: '#3B82F6' },
  { name: 'SIMEI / MEI',            color: '#10B981' },
  { name: 'Lucro Presumido',        color: '#F59E0B' },
  { name: 'Lucro Real Trimestral',  color: '#EF4444' },
  { name: 'Lucro Real Anual',       color: '#DC2626' },
  { name: 'Imunes',                 color: '#8B5CF6' },
  { name: 'Isentas',                color: '#6366F1' },
];

export async function seedBrazilianTaxRegimes() {
  const created: string[] = [];
  for (const item of BRAZIL_DEFAULTS) {
    const exists = await prisma.taxRegime.findFirst({ where: { name: item.name } });
    if (!exists) {
      await prisma.taxRegime.create({ data: { name: item.name, color: item.color } });
      created.push(item.name);
    }
  }
  return created;
}
