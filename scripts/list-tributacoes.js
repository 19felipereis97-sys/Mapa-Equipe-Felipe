const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

prisma.taxRegime.findMany({ orderBy: { name: 'asc' } })
  .then(function(rows) {
    console.log('\nTributações cadastradas (' + rows.length + '):\n');
    rows.forEach(function(r) {
      console.log('  [' + r.id + '] ' + r.name + ' — cor: ' + (r.color || 'sem cor'));
    });
  })
  .catch(function(e) { console.error(e); })
  .finally(function() { return prisma.$disconnect(); });
