// scripts/clear-test-data.js
// Remove APENAS dados criados pelo seed-test-data.js (prefixo [TESTE]).
// Dados reais NÃO são afetados.

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🗑️  Iniciando limpeza de dados de teste [TESTE]...\n');

  // ── LOCALIZAR DADOS DE TESTE ─────────────────────────────────────────────────
  const testCompanies = await prisma.company.findMany({
    where: { corporateName: { startsWith: '[TESTE]' } },
    select: { id: true, corporateName: true },
  });
  const testCompanyIds = testCompanies.map(function(c) { return c.id; });

  const testProfessionals = await prisma.professional.findMany({
    where: { name: { startsWith: '[TESTE]' } },
    select: { id: true, name: true },
  });
  const testProfessionalIds = testProfessionals.map(function(p) { return p.id; });

  const testTeams = await prisma.team.findMany({
    where: { name: { startsWith: '[TESTE]' } },
    select: { id: true, name: true },
  });

  console.log('Encontrado:');
  console.log('  • ' + testCompanies.length + ' empresas [TESTE]');
  console.log('  • ' + testProfessionals.length + ' profissionais [TESTE]');
  console.log('  • ' + testTeams.length + ' equipes [TESTE]');
  console.log('');

  if (testCompanies.length === 0 && testProfessionals.length === 0 && testTeams.length === 0) {
    // Verifica se há outros dados de teste sem empresa
    const orphanNotes = await prisma.closingNote.count({ where: { title: { startsWith: '[TESTE]' } } });
    const orphanReminders = await prisma.reminder.count({ where: { text: { startsWith: '[TESTE]' } } });
    const orphanMonthly = await prisma.monthlyGoal.count({ where: { title: { startsWith: '[TESTE]' } } });
    const orphanDaily = await prisma.dailyGoal.count({ where: { title: { startsWith: '[TESTE]' } } });
    if (orphanNotes + orphanReminders + orphanMonthly + orphanDaily === 0) {
      console.log('ℹ️  Nenhum dado de teste encontrado. Nada a remover.\n');
      return;
    }
  }

  // ── 1. ANOTAÇÕES DE FECHAMENTO ───────────────────────────────────────────────
  if (testCompanyIds.length > 0) {
    const r1 = await prisma.closingNote.deleteMany({ where: { companyId: { in: testCompanyIds } } });
    if (r1.count > 0) console.log('  ✓ ' + r1.count + ' anotações vinculadas a empresas [TESTE] removidas');
  }
  const r2 = await prisma.closingNote.deleteMany({ where: { title: { startsWith: '[TESTE]' } } });
  if (r2.count > 0) console.log('  ✓ ' + r2.count + ' anotações [TESTE] sem empresa removidas');

  // ── 2. LEMBRETES ─────────────────────────────────────────────────────────────
  if (testCompanyIds.length > 0) {
    const r3 = await prisma.reminder.deleteMany({ where: { companyId: { in: testCompanyIds } } });
    if (r3.count > 0) console.log('  ✓ ' + r3.count + ' lembretes vinculados a empresas [TESTE] removidos');
  }
  const r4 = await prisma.reminder.deleteMany({ where: { text: { startsWith: '[TESTE]' } } });
  if (r4.count > 0) console.log('  ✓ ' + r4.count + ' lembretes [TESTE] sem empresa removidos');

  // ── 3. HISTÓRICO DE ATIVIDADES ───────────────────────────────────────────────
  if (testCompanyIds.length > 0) {
    const r5 = await prisma.activityStatusHistory.deleteMany({ where: { companyId: { in: testCompanyIds } } });
    if (r5.count > 0) console.log('  ✓ ' + r5.count + ' registros de histórico removidos');
  }

  // ── 4. STATUS DE ATIVIDADES ──────────────────────────────────────────────────
  if (testCompanyIds.length > 0) {
    const r6 = await prisma.activityStatus.deleteMany({ where: { companyId: { in: testCompanyIds } } });
    if (r6.count > 0) console.log('  ✓ ' + r6.count + ' status de atividade removidos');
  }

  // ── 5. TRIBUTAÇÕES DAS EMPRESAS ──────────────────────────────────────────────
  if (testCompanyIds.length > 0) {
    const r7 = await prisma.companyTaxRegime.deleteMany({ where: { companyId: { in: testCompanyIds } } });
    if (r7.count > 0) console.log('  ✓ ' + r7.count + ' vínculos de tributação removidos');
  }

  // ── 6. EMPRESAS ──────────────────────────────────────────────────────────────
  if (testCompanyIds.length > 0) {
    const r8 = await prisma.company.deleteMany({ where: { id: { in: testCompanyIds } } });
    console.log('  ✓ ' + r8.count + ' empresas [TESTE] removidas');
  }

  // ── 7. FOLGAS ────────────────────────────────────────────────────────────────
  if (testProfessionalIds.length > 0) {
    const r9 = await prisma.leave.deleteMany({ where: { professionalId: { in: testProfessionalIds } } });
    if (r9.count > 0) console.log('  ✓ ' + r9.count + ' folgas removidas');
  }

  // ── 8. PROFISSIONAIS ─────────────────────────────────────────────────────────
  if (testProfessionalIds.length > 0) {
    const r10 = await prisma.professional.deleteMany({ where: { id: { in: testProfessionalIds } } });
    console.log('  ✓ ' + r10.count + ' profissionais [TESTE] removidos');
  }

  // ── 9. EQUIPES ───────────────────────────────────────────────────────────────
  if (testTeams.length > 0) {
    const r11 = await prisma.team.deleteMany({ where: { name: { startsWith: '[TESTE]' } } });
    console.log('  ✓ ' + r11.count + ' equipes [TESTE] removidas');
  }

  // ── 10. METAS MENSAIS ────────────────────────────────────────────────────────
  const r12 = await prisma.monthlyGoal.deleteMany({ where: { title: { startsWith: '[TESTE]' } } });
  if (r12.count > 0) console.log('  ✓ ' + r12.count + ' metas mensais [TESTE] removidas');

  // ── 11. METAS DO DIA ─────────────────────────────────────────────────────────
  const r13 = await prisma.dailyGoal.deleteMany({ where: { title: { startsWith: '[TESTE]' } } });
  if (r13.count > 0) console.log('  ✓ ' + r13.count + ' metas do dia [TESTE] removidas');

  console.log('\n✅ Limpeza concluída! Dados reais não foram afetados.');
  console.log('Para criar novos dados de teste: node scripts/seed-test-data.js\n');
}

main()
  .catch(function(e) { console.error('❌ Erro na limpeza:', e); process.exit(1); })
  .finally(function() { return prisma.$disconnect(); });
