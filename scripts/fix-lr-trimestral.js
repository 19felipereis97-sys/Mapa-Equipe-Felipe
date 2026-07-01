const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.taxRegime.update({
  where: { id: 1 },
  data: { color: '#EF4444' },
})
  .then(function(r) { console.log('Atualizado:', r.name, '->', r.color); })
  .catch(function(e) { console.error(e); })
  .finally(function() { return prisma.$disconnect(); });
