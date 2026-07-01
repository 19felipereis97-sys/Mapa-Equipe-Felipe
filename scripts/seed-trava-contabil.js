const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const existing = await prisma.obligation.findUnique({ where: { code: 'trava_contabil' } });
  if (existing) {
    console.log('Obrigação trava_contabil já existe (id:', existing.id, ')');
    return;
  }

  const maxOrder = await prisma.obligation.aggregate({ _max: { order: true } });
  const nextOrder = (maxOrder._max.order ?? 0) + 1;

  const created = await prisma.obligation.create({
    data: {
      code: 'trava_contabil',
      name: 'Trava Contábil',
      group: 'CONTÁBIL',
      type: 'Contábil',
      order: nextOrder,
      isDefault: true,
      active: true,
    },
  });

  console.log('Obrigação criada:', created);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
