const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ITEMS = [
  { name: 'Simples Nacional',      color: '#3B82F6' },
  { name: 'SIMEI / MEI',           color: '#10B981' },
  { name: 'Lucro Presumido',       color: '#F59E0B' },
  { name: 'Lucro Real Trimestral', color: '#EF4444' },
  { name: 'Lucro Real Anual',      color: '#DC2626' },
  { name: 'Imunes',                color: '#8B5CF6' },
  { name: 'Isentas',               color: '#6366F1' },
];

async function main() {
  const created = [];
  const skipped = [];
  for (const item of ITEMS) {
    const exists = await prisma.taxRegime.findFirst({ where: { name: item.name } });
    if (!exists) {
      await prisma.taxRegime.create({ data: item });
      created.push(item.name);
    } else {
      skipped.push(item.name);
    }
  }
  console.log('Criadas:', created.length ? created.join(', ') : 'nenhuma');
  console.log('Ja existiam:', skipped.length ? skipped.join(', ') : 'nenhuma');
}

main()
  .catch(function(e) { console.error(e); process.exit(1); })
  .finally(function() { prisma.$disconnect(); });
