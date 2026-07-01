// scripts/seed-test-data.js
// Popula o banco com dados fictícios identificados com prefixo [TESTE].
// Seguro para rodar junto com dados reais — não sobrescreve nada existente.
// Antes de rodar: verifique que NODE_ENV=development ou que o banco é de teste.
// Para limpar depois: node scripts/clear-test-data.js

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function alreadySeeded() {
  const existing = await prisma.team.findFirst({ where: { name: { startsWith: '[TESTE]' } } });
  return !!existing;
}

async function main() {
  console.log('🌱 Iniciando seed de dados de teste...\n');

  if (await alreadySeeded()) {
    console.log('⚠️  Dados de teste já existem.');
    console.log('   Para re-seeding, execute primeiro: node scripts/clear-test-data.js\n');
    return;
  }

  const today = new Date();
  const fmt = (d) => d.toISOString().split('T')[0];
  const daysOffset = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return fmt(d);
  };
  const dateOffset = (n) => {
    const d = new Date(today);
    d.setDate(d.getDate() + n);
    return d;
  };

  // ── 1. EQUIPES ───────────────────────────────────────────────────────────────
  console.log('1. Criando equipes...');
  const tContabil    = await prisma.team.create({ data: { name: '[TESTE] Contábil', active: true } });
  const tFiscal      = await prisma.team.create({ data: { name: '[TESTE] Fiscal', active: true } });
  const tDP          = await prisma.team.create({ data: { name: '[TESTE] Departamento Pessoal', active: true } });
  const tRevisao     = await prisma.team.create({ data: { name: '[TESTE] Revisão', active: true } });
  const tFinanceiro  = await prisma.team.create({ data: { name: '[TESTE] Financeiro', active: true } });
  console.log('   ✓ 5 equipes criadas\n');

  // ── 2. PROFISSIONAIS ─────────────────────────────────────────────────────────
  console.log('2. Criando profissionais...');
  const pAna      = await prisma.professional.create({ data: { name: '[TESTE] Ana Lima',       email: 'ana.teste@mapa.local',      active: true,  teamId: tContabil.id   } });
  const pBruno    = await prisma.professional.create({ data: { name: '[TESTE] Bruno Costa',    email: 'bruno.teste@mapa.local',    active: true,  teamId: tFiscal.id     } });
  const pCarla    = await prisma.professional.create({ data: { name: '[TESTE] Carla Souza',    email: 'carla.teste@mapa.local',    active: true,  teamId: tDP.id         } });
  const pDiego    = await prisma.professional.create({ data: { name: '[TESTE] Diego Martins',  email: 'diego.teste@mapa.local',    active: true,  teamId: tRevisao.id    } });
  const pFernanda = await prisma.professional.create({ data: { name: '[TESTE] Fernanda Rocha', email: 'fernanda.teste@mapa.local', active: true,  teamId: tContabil.id   } });
  const pJoao     = await prisma.professional.create({ data: { name: '[TESTE] João Pereira',   email: 'joao.teste@mapa.local',     active: true,  teamId: tFinanceiro.id } });
  const pPaula    = await prisma.professional.create({ data: { name: '[TESTE] Paula Nogueira', email: 'paula.teste@mapa.local',    active: false, teamId: tDP.id         } });
  await prisma.professional.create({                  data: { name: '[TESTE] Ricardo Alves',  email: 'ricardo.teste@mapa.local',  active: false, teamId: tFiscal.id     } });
  console.log('   ✓ 8 profissionais criados (6 ativos, 2 inativos)\n');

  // ── 3. TRIBUTAÇÕES ───────────────────────────────────────────────────────────
  console.log('3. Garantindo tributações...');
  const taxRegimesNeeded = [
    { name: 'Simples Nacional',      color: '#3B82F6' },
    { name: 'Lucro Presumido',       color: '#F59E0B' },
    { name: 'Lucro Real',            color: '#EF4444' },
    { name: 'Imunes',                color: '#8B5CF6' },
    { name: 'Isentas',               color: '#6366F1' },
  ];
  const taxRegimes = {};
  for (const tr of taxRegimesNeeded) {
    let existing = await prisma.taxRegime.findFirst({ where: { name: tr.name } });
    if (!existing) {
      existing = await prisma.taxRegime.create({ data: tr });
      console.log('   + Criado: ' + tr.name);
    }
    taxRegimes[tr.name] = existing;
  }
  const trSimples = taxRegimes['Simples Nacional'];
  const trLP      = taxRegimes['Lucro Presumido'];
  const trLR      = taxRegimes['Lucro Real'];
  console.log('   ✓ Tributações garantidas\n');

  // ── 4. NÍVEIS ────────────────────────────────────────────────────────────────
  console.log('4. Garantindo níveis...');
  const levelsNeeded = [
    { name: 'Sênior', color: '#F59E0B' },
    { name: 'Pleno',  color: '#3B82F6' },
    { name: 'Master', color: '#10B981' },
    { name: 'Básico', color: '#6B7280' },
  ];
  const levels = {};
  for (const lv of levelsNeeded) {
    let existing = await prisma.level.findFirst({ where: { name: lv.name } });
    if (!existing) {
      existing = await prisma.level.create({ data: lv });
      console.log('   + Criado nível: ' + lv.name);
    }
    levels[lv.name] = existing;
  }
  console.log('   ✓ Níveis garantidos\n');

  // ── 5. ANOS CONTÁBEIS ────────────────────────────────────────────────────────
  console.log('5. Garantindo anos contábeis...');
  const accountingYears = {};
  for (const y of [2025, 2026, 2027]) {
    let existing = await prisma.accountingYear.findFirst({ where: { year: y } });
    if (!existing) {
      // Ativa 2026 apenas se ainda não existir nenhum ano ativo
      const hasActive = await prisma.accountingYear.findFirst({ where: { active: true } });
      existing = await prisma.accountingYear.create({
        data: { year: y, active: y === 2026 && !hasActive },
      });
      console.log('   + Criado ano: ' + y + (existing.active ? ' (ativo)' : ''));
    }
    accountingYears[y] = existing;
  }
  console.log('   ✓ Anos contábeis garantidos\n');

  // ── 6. OBRIGAÇÕES ────────────────────────────────────────────────────────────
  console.log('6. Carregando obrigações...');
  const allObligations = await prisma.obligation.findMany();
  if (allObligations.length === 0) {
    console.log('   ⚠️  Nenhuma obrigação encontrada. Execute: npm run db:seed');
    return;
  }
  const oblByCode = {};
  for (const o of allObligations) oblByCode[o.code] = o;
  console.log('   ✓ ' + allObligations.length + ' obrigações carregadas\n');

  // ── 7. PRAZOS ────────────────────────────────────────────────────────────────
  console.log('7. Garantindo prazos...');
  const deadlinesNeeded = [
    { code: 'dp',             startDay: 1,  dueDay: 5  },
    { code: 'fiscal_simples', startDay: 1,  dueDay: 10 },
    { code: 'fiscal_icms',    startDay: 1,  dueDay: 12 },
    { code: 'fiscal_servico', startDay: 1,  dueDay: 12 },
    { code: 'financeiro',     startDay: 1,  dueDay: 8  },
    { code: 'analise',        startDay: 5,  dueDay: 15 },
    { code: 'revisao',        startDay: 10, dueDay: 20 },
    { code: 'ir_aluguel',     startDay: 1,  dueDay: 10 },
    { code: 'mit',            startDay: 1,  dueDay: 20 },
    { code: 'sped_ecd',       startDay: 1,  dueDay: 31 },
    { code: 'sped_ecf',       startDay: 1,  dueDay: 31 },
  ];
  for (const d of deadlinesNeeded) {
    const obl = oblByCode[d.code];
    if (!obl) { console.log('   ⚠️  Obrigação não encontrada: ' + d.code); continue; }
    const existing = await prisma.deadline.findFirst({ where: { obligationId: obl.id } });
    if (!existing) {
      await prisma.deadline.create({
        data: { obligationId: obl.id, startDay: d.startDay, dueDay: d.dueDay, active: true },
      });
      console.log('   + Prazo criado: ' + d.code + ' (dia ' + d.dueDay + ')');
    }
  }
  console.log('   ✓ Prazos garantidos\n');

  // ── 8. EMPRESAS ──────────────────────────────────────────────────────────────
  console.log('8. Criando empresas...');

  async function createCompany(data, taxByYear) {
    const company = await prisma.company.create({ data });
    for (const [year, taxRegime] of Object.entries(taxByYear)) {
      const ay = accountingYears[parseInt(year)];
      if (ay) {
        await prisma.companyTaxRegime.create({
          data: { companyId: company.id, accountingYearId: ay.id, taxRegimeId: taxRegime.id },
        });
      }
    }
    return company;
  }

  // 4.1 Simples Comércio
  const cAlfa = await createCompany({
    corporateName: '[TESTE] Alfa Comércio LTDA', operationCommerce: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Pleno'].id,
  }, { 2025: trSimples, 2026: trSimples });

  // 4.2 Simples Serviço
  const cBeta = await createCompany({
    corporateName: '[TESTE] Beta Serviços LTDA', operationService: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Pleno'].id,
  }, { 2025: trSimples, 2026: trSimples });

  // 4.3 Lucro Presumido Comércio
  const cGama = await createCompany({
    corporateName: '[TESTE] Gama Distribuidora LTDA', operationCommerce: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Sênior'].id,
  }, { 2025: trLP, 2026: trLP });

  // 4.4 Lucro Presumido Serviço
  const cDelta = await createCompany({
    corporateName: '[TESTE] Delta Consultoria LTDA', operationService: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Sênior'].id,
  }, { 2025: trLP, 2026: trLP });

  // 4.5 Lucro Real Indústria
  const cOmega = await createCompany({
    corporateName: '[TESTE] Ômega Indústria LTDA', operationIndustry: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, mitResponsibleId: pFernanda.id,
    levelId: levels['Master'].id,
  }, { 2025: trLR, 2026: trLR });

  // 4.6 Lucro Real Serviço + IR Aluguel
  const cSigma = await createCompany({
    corporateName: '[TESTE] Sigma Participações LTDA', operationService: true, irRent: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id,
    mitResponsibleId: pFernanda.id, irRentResponsibleId: pFernanda.id, levelId: levels['Master'].id,
  }, { 2025: trLR, 2026: trLR });

  // 4.7 Início de competência em abril
  const cInicioAbril = await createCompany({
    corporateName: '[TESTE] Início Abril LTDA', operationCommerce: true, startCompetence: '04/2026',
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Básico'].id,
  }, { 2025: trLP, 2026: trLP });

  // 4.8 Rescindida em maio
  const cRescMaio = await createCompany({
    corporateName: '[TESTE] Rescindida Maio LTDA', operationCommerce: true,
    terminated: true, terminationMonth: '05/2026',
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Básico'].id,
  }, { 2025: trLP, 2026: trLP });

  // 4.9 Rescindida em dezembro
  const cRescDez = await createCompany({
    corporateName: '[TESTE] Rescindida Dezembro LTDA', operationCommerce: true,
    terminated: true, terminationMonth: '12/2026',
    dpResponsibleId: pCarla.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Básico'].id,
  }, { 2025: trLP, 2026: trLP });

  // 4.10 IR Aluguel
  const cImobiliaria = await createCompany({
    corporateName: '[TESTE] Imobiliária Central LTDA', operationService: true, irRent: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, irRentResponsibleId: pFernanda.id,
    levelId: levels['Pleno'].id,
  }, { 2025: trLP, 2026: trLP });

  // 4.11 Sem responsável fiscal
  const cSemFiscal = await createCompany({
    corporateName: '[TESTE] Sem Responsável Fiscal LTDA', operationCommerce: true,
    dpResponsibleId: pCarla.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Básico'].id,
  }, { 2026: trSimples });

  // 4.12 Sem tributação anterior (2025 vazia)
  const cSemTribAnterior = await createCompany({
    corporateName: '[TESTE] Sem Tributação Anterior LTDA', operationCommerce: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Básico'].id,
  }, { 2026: trLP });

  // 4.13 Migração de regime (Simples 2025 → LP 2026)
  const cMigracao = await createCompany({
    corporateName: '[TESTE] Migração Regime LTDA', operationCommerce: true, operationService: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, levelId: levels['Pleno'].id,
  }, { 2025: trSimples, 2026: trLP });

  // 4.14 Matriz
  const cMatriz = await createCompany({
    corporateName: '[TESTE] Matriz Principal LTDA', companyType: 'MATRIZ', groupName: 'Grupo Teste Matriz',
    operationCommerce: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, mitResponsibleId: pFernanda.id,
    levelId: levels['Master'].id,
  }, { 2025: trLR, 2026: trLR });

  // 4.15 Filial
  const cFilial = await createCompany({
    corporateName: '[TESTE] Filial Teste LTDA', companyType: 'FILIAL', groupName: 'Grupo Teste Matriz',
    operationCommerce: true,
    dpResponsibleId: pCarla.id, fiscalResponsibleId: pBruno.id, financialResponsibleId: pJoao.id,
    analysisResponsibleId: pAna.id, reviewResponsibleId: pDiego.id, mitResponsibleId: pFernanda.id,
    levelId: levels['Sênior'].id,
  }, { 2025: trLR, 2026: trLR });

  console.log('   ✓ 15 empresas criadas\n');

  // ── 9. STATUS DE ATIVIDADES ──────────────────────────────────────────────────
  console.log('9. Criando status de atividades (ano 2026)...');
  const YEAR = 2026;

  async function setStatus(companyId, code, month, status, obs, responsibleId) {
    const obl = oblByCode[code];
    if (!obl) return;
    await prisma.activityStatus.upsert({
      where: { companyId_obligationId_year_month: { companyId, obligationId: obl.id, year: YEAR, month } },
      update: { status, observation: obs, responsibleId },
      create: { companyId, obligationId: obl.id, year: YEAR, month, status, observation: obs, responsibleId },
    });
  }

  // [TESTE] Alfa Comércio — Simples, comércio
  await setStatus(cAlfa.id, 'dp',             1, 'OK',   null, pCarla.id);
  await setStatus(cAlfa.id, 'dp',             2, 'OK',   null, pCarla.id);
  await setStatus(cAlfa.id, 'dp',             3, 'OK',   null, pCarla.id);
  await setStatus(cAlfa.id, 'dp',             4, 'OK',   null, pCarla.id);
  await setStatus(cAlfa.id, 'dp',             5, 'OK',   null, pCarla.id);
  await setStatus(cAlfa.id, 'dp',             6, 'S/M',  null, pCarla.id);
  await setStatus(cAlfa.id, 'dp',             7, 'P',    '[TESTE] Aguardando folha de pagamento', pCarla.id);
  await setStatus(cAlfa.id, 'fiscal_simples', 1, 'OK',   null, pBruno.id);
  await setStatus(cAlfa.id, 'fiscal_simples', 2, 'OK',   null, pBruno.id);
  await setStatus(cAlfa.id, 'fiscal_simples', 3, 'OK',   null, pBruno.id);
  await setStatus(cAlfa.id, 'fiscal_simples', 4, 'OK',   null, pBruno.id);
  await setStatus(cAlfa.id, 'fiscal_simples', 5, 'P',    '[TESTE] Notas fiscais pendentes de lançamento', pBruno.id);
  await setStatus(cAlfa.id, 'fiscal_simples', 6, 'ST-I', '[TESTE] Aguardando retificação de guia', pBruno.id);
  await setStatus(cAlfa.id, 'financeiro',     1, 'OK',   null, pJoao.id);
  await setStatus(cAlfa.id, 'financeiro',     2, 'OK',   null, pJoao.id);
  await setStatus(cAlfa.id, 'financeiro',     3, 'OK',   null, pJoao.id);
  await setStatus(cAlfa.id, 'financeiro',     4, 'OK',   null, pJoao.id);
  await setStatus(cAlfa.id, 'financeiro',     5, 'ST-C', null, pJoao.id);
  await setStatus(cAlfa.id, 'analise',        1, 'OK',   null, pAna.id);
  await setStatus(cAlfa.id, 'analise',        2, 'OK',   null, pAna.id);
  await setStatus(cAlfa.id, 'analise',        3, 'OK',   null, pAna.id);
  await setStatus(cAlfa.id, 'analise',        4, 'S/M',  null, pAna.id);
  await setStatus(cAlfa.id, 'analise',        5, 'P',    '[TESTE] Divergência no estoque de mercadorias', pAna.id);
  await setStatus(cAlfa.id, 'revisao',        1, 'OK',   null, pDiego.id);
  await setStatus(cAlfa.id, 'revisao',        2, 'OK',   null, pDiego.id);
  await setStatus(cAlfa.id, 'revisao',        3, 'OK',   null, pDiego.id);
  await setStatus(cAlfa.id, 'revisao',        4, 'P',    '[TESTE] Revisar balancete antes de assinar', pDiego.id);

  // [TESTE] Beta Serviços — Simples, serviço
  await setStatus(cBeta.id, 'dp',             1, 'OK',   null, pCarla.id);
  await setStatus(cBeta.id, 'dp',             2, 'OK',   null, pCarla.id);
  await setStatus(cBeta.id, 'dp',             3, 'S/M',  null, pCarla.id);
  await setStatus(cBeta.id, 'dp',             4, 'OK',   null, pCarla.id);
  await setStatus(cBeta.id, 'dp',             5, 'P',    '[TESTE] Funcionário admitido sem documentação completa', pCarla.id);
  await setStatus(cBeta.id, 'fiscal_simples', 1, 'OK',   null, pBruno.id);
  await setStatus(cBeta.id, 'fiscal_simples', 2, 'OK',   null, pBruno.id);
  await setStatus(cBeta.id, 'fiscal_simples', 3, 'OK',   null, pBruno.id);
  await setStatus(cBeta.id, 'fiscal_simples', 4, 'ST-I', '[TESTE] Aguardando decisão fiscal sobre ISS', pBruno.id);
  await setStatus(cBeta.id, 'financeiro',     1, 'OK',   null, pJoao.id);
  await setStatus(cBeta.id, 'financeiro',     2, 'OK',   null, pJoao.id);
  await setStatus(cBeta.id, 'financeiro',     3, 'OK',   null, pJoao.id);
  await setStatus(cBeta.id, 'analise',        1, 'OK',   null, pAna.id);
  await setStatus(cBeta.id, 'analise',        2, 'OK',   null, pAna.id);
  await setStatus(cBeta.id, 'analise',        3, 'OK',   null, pAna.id);
  await setStatus(cBeta.id, 'revisao',        1, 'OK',   null, pDiego.id);
  await setStatus(cBeta.id, 'revisao',        2, 'OK',   null, pDiego.id);

  // [TESTE] Gama Distribuidora — LP, comércio (SPED elegível: LP 2025)
  await setStatus(cGama.id, 'dp',          1, 'OK',   null, pCarla.id);
  await setStatus(cGama.id, 'dp',          2, 'OK',   null, pCarla.id);
  await setStatus(cGama.id, 'dp',          3, 'OK',   null, pCarla.id);
  await setStatus(cGama.id, 'dp',          4, 'P',    '[TESTE] Rescisão de funcionário em andamento', pCarla.id);
  await setStatus(cGama.id, 'fiscal_icms', 1, 'OK',   null, pBruno.id);
  await setStatus(cGama.id, 'fiscal_icms', 2, 'OK',   null, pBruno.id);
  await setStatus(cGama.id, 'fiscal_icms', 3, 'OK',   null, pBruno.id);
  await setStatus(cGama.id, 'fiscal_icms', 4, 'P',    '[TESTE] SEFAZ fora do ar na data de envio', pBruno.id);
  await setStatus(cGama.id, 'fiscal_icms', 5, 'ST-I', '[TESTE] Aguardando retificação de NF-e de entrada', pBruno.id);
  await setStatus(cGama.id, 'financeiro',  1, 'OK',   null, pJoao.id);
  await setStatus(cGama.id, 'financeiro',  2, 'OK',   null, pJoao.id);
  await setStatus(cGama.id, 'analise',     1, 'OK',   null, pAna.id);
  await setStatus(cGama.id, 'analise',     2, 'OK',   null, pAna.id);
  await setStatus(cGama.id, 'analise',     3, 'P',    '[TESTE] Aguardar conciliação bancária completa', pAna.id);
  await setStatus(cGama.id, 'revisao',     1, 'OK',   null, pDiego.id);
  await setStatus(cGama.id, 'sped_ecd',   0, 'OK',   null, pAna.id);
  await setStatus(cGama.id, 'sped_ecf',   0, 'P',    '[TESTE] Dados de imobilizado incompletos', pAna.id);

  // [TESTE] Delta Consultoria — LP, serviço (SPED elegível: LP 2025)
  await setStatus(cDelta.id, 'dp',             1, 'OK',   null, pCarla.id);
  await setStatus(cDelta.id, 'dp',             2, 'OK',   null, pCarla.id);
  await setStatus(cDelta.id, 'dp',             3, 'OK',   null, pCarla.id);
  await setStatus(cDelta.id, 'fiscal_servico', 1, 'OK',   null, pBruno.id);
  await setStatus(cDelta.id, 'fiscal_servico', 2, 'OK',   null, pBruno.id);
  await setStatus(cDelta.id, 'fiscal_servico', 3, 'OK',   null, pBruno.id);
  await setStatus(cDelta.id, 'fiscal_servico', 4, 'P',    '[TESTE] ISS retido na fonte a verificar', pBruno.id);
  await setStatus(cDelta.id, 'financeiro',     1, 'OK',   null, pJoao.id);
  await setStatus(cDelta.id, 'financeiro',     2, 'OK',   null, pJoao.id);
  await setStatus(cDelta.id, 'analise',        1, 'OK',   null, pAna.id);
  await setStatus(cDelta.id, 'analise',        2, 'OK',   null, pAna.id);
  await setStatus(cDelta.id, 'revisao',        1, 'OK',   null, pDiego.id);
  await setStatus(cDelta.id, 'sped_ecd',       0, 'P',    '[TESTE] Plano de contas desatualizado no sistema', pAna.id);
  await setStatus(cDelta.id, 'sped_ecf',       0, 'OK',   null, pAna.id);

  // [TESTE] Ômega Indústria — LR, indústria (SPED elegível: LR 2025)
  await setStatus(cOmega.id, 'dp',          1, 'OK',   null, pCarla.id);
  await setStatus(cOmega.id, 'dp',          2, 'OK',   null, pCarla.id);
  await setStatus(cOmega.id, 'dp',          3, 'OK',   null, pCarla.id);
  await setStatus(cOmega.id, 'fiscal_icms', 1, 'OK',   null, pBruno.id);
  await setStatus(cOmega.id, 'fiscal_icms', 2, 'OK',   null, pBruno.id);
  await setStatus(cOmega.id, 'fiscal_icms', 3, 'P',    '[TESTE] ICMS ST a recolher pendente de apuração', pBruno.id);
  await setStatus(cOmega.id, 'financeiro',  1, 'OK',   null, pJoao.id);
  await setStatus(cOmega.id, 'financeiro',  2, 'OK',   null, pJoao.id);
  await setStatus(cOmega.id, 'financeiro',  3, 'ST-C', null, pJoao.id);
  await setStatus(cOmega.id, 'analise',     1, 'OK',   null, pAna.id);
  await setStatus(cOmega.id, 'analise',     2, 'P',    '[TESTE] Custo de produção pendente de rateio', pAna.id);
  await setStatus(cOmega.id, 'revisao',     1, 'OK',   null, pDiego.id);
  await setStatus(cOmega.id, 'mit',         1, 'OK',   null, pFernanda.id);
  await setStatus(cOmega.id, 'mit',         2, 'OK',   null, pFernanda.id);
  await setStatus(cOmega.id, 'mit',         3, 'ST-C', null, pFernanda.id);
  await setStatus(cOmega.id, 'sped_ecd',   0, 'OK',   null, pAna.id);
  await setStatus(cOmega.id, 'sped_ecf',   0, 'OK',   null, pAna.id);

  // [TESTE] Sigma Participações — LR, serviço + irRent (SPED elegível: LR 2025)
  await setStatus(cSigma.id, 'dp',             1, 'OK',   null, pCarla.id);
  await setStatus(cSigma.id, 'dp',             2, 'OK',   null, pCarla.id);
  await setStatus(cSigma.id, 'fiscal_servico', 1, 'OK',   null, pBruno.id);
  await setStatus(cSigma.id, 'fiscal_servico', 2, 'P',    '[TESTE] NFS-e pendente de retificação de ISS', pBruno.id);
  await setStatus(cSigma.id, 'financeiro',     1, 'OK',   null, pJoao.id);
  await setStatus(cSigma.id, 'analise',        1, 'OK',   null, pAna.id);
  await setStatus(cSigma.id, 'revisao',        1, 'OK',   null, pDiego.id);
  await setStatus(cSigma.id, 'ir_aluguel',     1, 'OK',   null, pFernanda.id);
  await setStatus(cSigma.id, 'ir_aluguel',     2, 'P',    '[TESTE] Contrato de aluguel não enviado pelo cliente', pFernanda.id);
  await setStatus(cSigma.id, 'mit',            1, 'OK',   null, pFernanda.id);
  await setStatus(cSigma.id, 'mit',            2, 'P',    '[TESTE] CSLL a verificar, possível diferença', pFernanda.id);
  await setStatus(cSigma.id, 'sped_ecd',       0, 'P',    '[TESTE] Abertura de conta patrimonial pendente', pAna.id);
  await setStatus(cSigma.id, 'sped_ecf',       0, 'OK',   null, pAna.id);

  // [TESTE] Início Abril — meses 1/2/3 bloqueados por startCompetence: 04/2026
  await setStatus(cInicioAbril.id, 'dp',          4, 'OK',   null, pCarla.id);
  await setStatus(cInicioAbril.id, 'dp',          5, 'OK',   null, pCarla.id);
  await setStatus(cInicioAbril.id, 'fiscal_icms', 4, 'OK',   null, pBruno.id);
  await setStatus(cInicioAbril.id, 'fiscal_icms', 5, 'P',    '[TESTE] Primeira apuração de ICMS da empresa', pBruno.id);
  await setStatus(cInicioAbril.id, 'financeiro',  4, 'OK',   null, pJoao.id);
  await setStatus(cInicioAbril.id, 'analise',     4, 'OK',   null, pAna.id);

  // [TESTE] Rescindida Maio — meses 6-12 bloqueados
  await setStatus(cRescMaio.id, 'dp',          1, 'OK',  null, pCarla.id);
  await setStatus(cRescMaio.id, 'dp',          2, 'OK',  null, pCarla.id);
  await setStatus(cRescMaio.id, 'dp',          3, 'OK',  null, pCarla.id);
  await setStatus(cRescMaio.id, 'dp',          4, 'OK',  null, pCarla.id);
  await setStatus(cRescMaio.id, 'dp',          5, 'OK',  null, pCarla.id);
  await setStatus(cRescMaio.id, 'fiscal_icms', 1, 'OK',  null, pBruno.id);
  await setStatus(cRescMaio.id, 'fiscal_icms', 2, 'OK',  null, pBruno.id);
  await setStatus(cRescMaio.id, 'fiscal_icms', 3, 'OK',  null, pBruno.id);
  await setStatus(cRescMaio.id, 'fiscal_icms', 4, 'OK',  null, pBruno.id);
  await setStatus(cRescMaio.id, 'fiscal_icms', 5, 'OK',  null, pBruno.id);
  await setStatus(cRescMaio.id, 'financeiro',  1, 'OK',  null, pJoao.id);
  await setStatus(cRescMaio.id, 'financeiro',  2, 'OK',  null, pJoao.id);
  await setStatus(cRescMaio.id, 'financeiro',  3, 'OK',  null, pJoao.id);
  await setStatus(cRescMaio.id, 'financeiro',  4, 'OK',  null, pJoao.id);
  await setStatus(cRescMaio.id, 'financeiro',  5, 'OK',  null, pJoao.id);
  await setStatus(cRescMaio.id, 'sped_ecd',    0, 'OK',  null, pAna.id);

  // [TESTE] Rescindida Dezembro
  await setStatus(cRescDez.id, 'dp',          1, 'OK',  null, pCarla.id);
  await setStatus(cRescDez.id, 'dp',          2, 'OK',  null, pCarla.id);
  await setStatus(cRescDez.id, 'dp',          3, 'OK',  null, pCarla.id);
  await setStatus(cRescDez.id, 'fiscal_icms', 1, 'OK',  null, pBruno.id);
  await setStatus(cRescDez.id, 'fiscal_icms', 2, 'P',   '[TESTE] Complemento de ICMS de operação anterior', pBruno.id);
  await setStatus(cRescDez.id, 'financeiro',  1, 'OK',  null, pJoao.id);
  await setStatus(cRescDez.id, 'analise',     1, 'OK',  null, pAna.id);
  await setStatus(cRescDez.id, 'sped_ecd',    0, 'OK',  null, pAna.id);

  // [TESTE] Imobiliária Central — LP, serviço + irRent (SPED elegível: LP 2025)
  await setStatus(cImobiliaria.id, 'dp',             1, 'OK',   null, pCarla.id);
  await setStatus(cImobiliaria.id, 'dp',             2, 'OK',   null, pCarla.id);
  await setStatus(cImobiliaria.id, 'fiscal_servico', 1, 'OK',   null, pBruno.id);
  await setStatus(cImobiliaria.id, 'fiscal_servico', 2, 'OK',   null, pBruno.id);
  await setStatus(cImobiliaria.id, 'ir_aluguel',     1, 'OK',   null, pFernanda.id);
  await setStatus(cImobiliaria.id, 'ir_aluguel',     2, 'P',    '[TESTE] Contratos de locação pendentes de envio', pFernanda.id);
  await setStatus(cImobiliaria.id, 'financeiro',     1, 'OK',   null, pJoao.id);
  await setStatus(cImobiliaria.id, 'analise',        1, 'OK',   null, pAna.id);
  await setStatus(cImobiliaria.id, 'sped_ecd',       0, 'OK',   null, pAna.id);
  await setStatus(cImobiliaria.id, 'sped_ecf',       0, 'OK',   null, pAna.id);

  // [TESTE] Migração Regime — Simples 2025 → LP 2026
  // 2026: LP → fiscal_icms (comércio) + fiscal_servico (serviço), NOT fiscal_simples
  // SPED: prev year (2025) = Simples → NÃO elegível para SPED 2026
  await setStatus(cMigracao.id, 'dp',             1, 'OK',  null, pCarla.id);
  await setStatus(cMigracao.id, 'dp',             2, 'OK',  null, pCarla.id);
  await setStatus(cMigracao.id, 'fiscal_icms',    1, 'OK',  null, pBruno.id);
  await setStatus(cMigracao.id, 'fiscal_icms',    2, 'OK',  null, pBruno.id);
  await setStatus(cMigracao.id, 'fiscal_servico', 1, 'OK',  null, pBruno.id);
  await setStatus(cMigracao.id, 'financeiro',     1, 'OK',  null, pJoao.id);
  await setStatus(cMigracao.id, 'analise',        1, 'OK',  null, pAna.id);

  // [TESTE] Sem Tributação Anterior (só 2026=LP)
  // SPED: prev year null → not Simples → elegível
  await setStatus(cSemTribAnterior.id, 'dp',          1, 'OK', null, pCarla.id);
  await setStatus(cSemTribAnterior.id, 'fiscal_icms', 1, 'OK', null, pBruno.id);
  await setStatus(cSemTribAnterior.id, 'financeiro',  1, 'OK', null, pJoao.id);
  await setStatus(cSemTribAnterior.id, 'analise',     1, 'OK', null, pAna.id);
  await setStatus(cSemTribAnterior.id, 'sped_ecd',    0, 'P',  '[TESTE] Primeiro SPED sem histórico anterior', pAna.id);

  // [TESTE] Sem Responsável Fiscal — Simples, sem fiscalResponsible
  await setStatus(cSemFiscal.id, 'dp',             1, 'OK', null, pCarla.id);
  await setStatus(cSemFiscal.id, 'fiscal_simples', 1, 'OK', null, null);
  await setStatus(cSemFiscal.id, 'financeiro',     1, 'OK', null, pJoao.id);
  await setStatus(cSemFiscal.id, 'analise',        1, 'OK', null, pAna.id);

  // [TESTE] Matriz Principal — LR, comércio (SPED elegível: LR 2025)
  await setStatus(cMatriz.id, 'dp',          1, 'OK',   null, pCarla.id);
  await setStatus(cMatriz.id, 'dp',          2, 'OK',   null, pCarla.id);
  await setStatus(cMatriz.id, 'fiscal_icms', 1, 'OK',   null, pBruno.id);
  await setStatus(cMatriz.id, 'fiscal_icms', 2, 'P',    '[TESTE] Diferencial de alíquota a recolher', pBruno.id);
  await setStatus(cMatriz.id, 'financeiro',  1, 'OK',   null, pJoao.id);
  await setStatus(cMatriz.id, 'analise',     1, 'OK',   null, pAna.id);
  await setStatus(cMatriz.id, 'mit',         1, 'OK',   null, pFernanda.id);
  await setStatus(cMatriz.id, 'sped_ecd',   0, 'OK',   null, pAna.id);
  await setStatus(cMatriz.id, 'sped_ecf',   0, 'P',    '[TESTE] Lucros distribuídos a validar', pAna.id);

  // [TESTE] Filial Teste — LR, comércio (SPED elegível: LR 2025)
  await setStatus(cFilial.id, 'dp',          1, 'OK',   null, pCarla.id);
  await setStatus(cFilial.id, 'dp',          2, 'OK',   null, pCarla.id);
  await setStatus(cFilial.id, 'fiscal_icms', 1, 'OK',   null, pBruno.id);
  await setStatus(cFilial.id, 'financeiro',  1, 'OK',   null, pJoao.id);
  await setStatus(cFilial.id, 'analise',     1, 'OK',   null, pAna.id);
  await setStatus(cFilial.id, 'mit',         1, 'OK',   null, pFernanda.id);
  await setStatus(cFilial.id, 'sped_ecd',   0, 'P',    '[TESTE] Consolidação com matriz pendente', pAna.id);
  await setStatus(cFilial.id, 'sped_ecf',   0, 'OK',   null, pAna.id);

  console.log('   ✓ Status de atividades criados\n');

  // ── 10. HISTÓRICO ────────────────────────────────────────────────────────────
  console.log('10. Criando histórico de atividades...');

  async function addHistory(companyId, code, month, prevStatus, newStatus, obs, responsibleId, daysAgo) {
    const obl = oblByCode[code];
    if (!obl) return;
    const createdAt = new Date(today.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    await prisma.activityStatusHistory.create({
      data: { companyId, obligationId: obl.id, year: YEAR, month, previousStatus: prevStatus, newStatus, observation: obs, responsibleId, createdAt },
    });
  }

  // Alfa — histórico de mudanças reais
  await addHistory(cAlfa.id, 'dp',             1, null,   'P',    '[TESTE] Aguardando folha de pagamento', pCarla.id, 62);
  await addHistory(cAlfa.id, 'dp',             1, 'P',    'OK',   null, pCarla.id, 55);
  await addHistory(cAlfa.id, 'fiscal_simples', 1, null,   'P',    '[TESTE] Notas pendentes', pBruno.id, 60);
  await addHistory(cAlfa.id, 'fiscal_simples', 1, 'P',    'OK',   null, pBruno.id, 50);
  await addHistory(cAlfa.id, 'dp',             6, null,   'S/M',  null, pCarla.id, 15);
  await addHistory(cAlfa.id, 'dp',             7, null,   'P',    '[TESTE] Aguardando folha de pagamento', pCarla.id, 5);
  await addHistory(cAlfa.id, 'fiscal_simples', 5, null,   'P',    '[TESTE] Notas fiscais pendentes de lançamento', pBruno.id, 8);
  await addHistory(cAlfa.id, 'fiscal_simples', 6, 'P',    'ST-I', '[TESTE] Aguardando retificação de guia', pBruno.id, 3);
  await addHistory(cAlfa.id, 'analise',        5, null,   'P',    '[TESTE] Divergência no estoque de mercadorias', pAna.id, 6);
  await addHistory(cAlfa.id, 'financeiro',     5, null,   'ST-C', null, pJoao.id, 4);

  // Gama
  await addHistory(cGama.id, 'fiscal_icms', 1, null,   'P',    '[TESTE] SEFAZ instável', pBruno.id, 90);
  await addHistory(cGama.id, 'fiscal_icms', 1, 'P',    'OK',   null, pBruno.id, 80);
  await addHistory(cGama.id, 'fiscal_icms', 4, null,   'P',    '[TESTE] SEFAZ fora do ar na data de envio', pBruno.id, 10);
  await addHistory(cGama.id, 'fiscal_icms', 5, 'P',    'ST-I', '[TESTE] Aguardando retificação de NF-e de entrada', pBruno.id, 4);
  await addHistory(cGama.id, 'sped_ecf',    0, null,   'P',    '[TESTE] Dados de imobilizado incompletos', pAna.id, 45);

  // Delta
  await addHistory(cDelta.id, 'fiscal_servico', 4, null, 'P',    '[TESTE] ISS retido na fonte a verificar', pBruno.id, 7);
  await addHistory(cDelta.id, 'sped_ecd',       0, null, 'P',    '[TESTE] Plano de contas desatualizado no sistema', pAna.id, 60);

  // Ômega
  await addHistory(cOmega.id, 'fiscal_icms', 3, null, 'P',    '[TESTE] ICMS ST a recolher pendente de apuração', pBruno.id, 12);
  await addHistory(cOmega.id, 'analise',     2, null, 'P',    '[TESTE] Custo de produção pendente de rateio', pAna.id, 9);
  await addHistory(cOmega.id, 'financeiro',  3, null, 'ST-C', null, pJoao.id, 7);

  // Sigma
  await addHistory(cSigma.id, 'fiscal_servico', 2, null, 'P',    '[TESTE] NFS-e pendente de retificação de ISS', pBruno.id, 5);
  await addHistory(cSigma.id, 'ir_aluguel',     2, null, 'P',    '[TESTE] Contrato de aluguel não enviado pelo cliente', pFernanda.id, 5);
  await addHistory(cSigma.id, 'sped_ecd',       0, null, 'P',    '[TESTE] Abertura de conta patrimonial pendente', pAna.id, 55);
  await addHistory(cSigma.id, 'mit',            2, null, 'P',    '[TESTE] CSLL a verificar, possível diferença', pFernanda.id, 4);

  // Imobiliária
  await addHistory(cImobiliaria.id, 'ir_aluguel', 2, null, 'P',  '[TESTE] Contratos de locação pendentes de envio', pFernanda.id, 6);

  // Matriz/Filial
  await addHistory(cMatriz.id, 'fiscal_icms', 2, null, 'P',    '[TESTE] Diferencial de alíquota a recolher', pBruno.id, 3);
  await addHistory(cMatriz.id, 'sped_ecf',    0, null, 'P',    '[TESTE] Lucros distribuídos a validar', pAna.id, 50);
  await addHistory(cFilial.id, 'sped_ecd',    0, null, 'P',    '[TESTE] Consolidação com matriz pendente', pAna.id, 48);

  // Rescindida Maio — histórico de OK antes da rescisão
  await addHistory(cRescMaio.id, 'dp',          1, null, 'OK', null, pCarla.id, 120);
  await addHistory(cRescMaio.id, 'fiscal_icms', 1, null, 'OK', null, pBruno.id, 118);

  // Teste de sequência: sem status → P → OK → S/M (para tela Histórico)
  await addHistory(cBeta.id, 'dp', 3, null,  'P',   '[TESTE] Problema com férias coletivas', pCarla.id, 25);
  await addHistory(cBeta.id, 'dp', 3, 'P',   'OK',  null, pCarla.id, 18);
  await addHistory(cBeta.id, 'dp', 3, 'OK',  'S/M', null, pCarla.id, 10);

  console.log('   ✓ Histórico criado\n');

  // ── 11. FOLGAS ───────────────────────────────────────────────────────────────
  console.log('11. Criando folgas...');
  await prisma.leave.createMany({
    data: [
      { professionalId: pAna.id,      startDate: daysOffset(0),   endDate: daysOffset(0),   description: '[TESTE] Consulta médica — folga de 1 dia hoje'       },
      { professionalId: pBruno.id,    startDate: daysOffset(5),   endDate: daysOffset(7),   description: '[TESTE] Férias parciais — 3 dias na próxima semana'   },
      { professionalId: pCarla.id,    startDate: daysOffset(2),   endDate: daysOffset(2),   description: '[TESTE] Feriado municipal'                             },
      { professionalId: pDiego.id,    startDate: daysOffset(-15), endDate: daysOffset(-15), description: '[TESTE] Folga compensatória — já passou'              },
      { professionalId: pFernanda.id, startDate: daysOffset(32),  endDate: daysOffset(35),  description: '[TESTE] Viagem a trabalho — próximo mês'              },
      { professionalId: pPaula.id,    startDate: daysOffset(-30), endDate: daysOffset(-28), description: '[TESTE] Licença médica — profissional inativo'         },
    ],
  });
  console.log('   ✓ 6 folgas criadas\n');

  // ── 12. METAS MENSAIS ────────────────────────────────────────────────────────
  console.log('12. Criando metas mensais...');
  const cm = today.getMonth() + 1;
  const cy = today.getFullYear();
  const prevMonth = cm === 1 ? 12 : cm - 1;
  const prevYear  = cm === 1 ? cy - 1 : cy;

  await prisma.monthlyGoal.createMany({
    data: [
      { title: '[TESTE] Fechar todos os clientes Lucro Real', description: '[TESTE] Prioridade máxima para clientes LR', month: cm, year: cy, completed: false },
      { title: '[TESTE] Revisar guias de ICMS pendentes', description: '[TESTE] Verificar todas as guias não pagas do mês', month: cm, year: cy, completed: false },
      { title: '[TESTE] Treinamento de nova ferramenta fiscal', description: null, month: cm, year: cy, completed: true, completedAt: new Date() },
      { title: '[TESTE] Atualizar contratos de aluguel dos clientes', description: '[TESTE] Revisar clientes com IR Aluguel ativo', month: cm, year: cy, completed: false },
      { title: '[TESTE] Organizar arquivo físico do trimestre', description: null, month: prevMonth, year: prevYear, completed: true, completedAt: new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000) },
    ],
  });
  console.log('   ✓ 5 metas mensais criadas\n');

  // ── 13. METAS DO DIA ─────────────────────────────────────────────────────────
  console.log('13. Criando metas do dia...');
  await prisma.dailyGoal.createMany({
    data: [
      { title: '[TESTE] Enviar DCTF Web', description: '[TESTE] Verificar antes das 18h — hoje', date: daysOffset(0), completed: false },
      { title: '[TESTE] Ligar para Alfa Comércio sobre pendência', description: null, date: daysOffset(0), completed: true, completedAt: new Date() },
      { title: '[TESTE] Conferir extrato de aplicações financeiras', description: '[TESTE] Banco Itaú conta corrente 001', date: daysOffset(0), completed: false },
      { title: '[TESTE] Lançar notas de serviço da Delta', description: null, date: daysOffset(-1), completed: true, completedAt: dateOffset(-1) },
      { title: '[TESTE] Revisar balancete Gama Distribuidora', description: '[TESTE] Verificar provisões de 13º', date: daysOffset(-1), completed: false },
      { title: '[TESTE] Reunião com cliente MIT — Ômega Indústria', description: '[TESTE] Apresentar relatório trimestral', date: daysOffset(1), completed: false },
      { title: '[TESTE] Fechar SPED ECD da Delta Consultoria', description: '[TESTE] Prazo final em 5 dias úteis', date: daysOffset(5), completed: false },
    ],
  });
  console.log('   ✓ 7 metas do dia criadas\n');

  // ── 14. ANOTAÇÕES DE FECHAMENTO ──────────────────────────────────────────────
  console.log('14. Criando anotações de fechamento...');
  await prisma.closingNote.createMany({
    data: [
      { companyId: cAlfa.id,      title: '[TESTE] Conferir receita financeira antes do fechamento',   content: '[TESTE] Cliente costuma ter aplicações financeiras que afetam o IRPJ. Solicitar extrato bancário antes de fechar análise.', pinned: true,  archived: false },
      { companyId: cBeta.id,      title: '[TESTE] Cliente costuma enviar extrato com atraso',          content: '[TESTE] Média de 5 dias corridos após fechamento do mês. Considerar ao agendar revisão.', pinned: false, archived: false },
      { companyId: cGama.id,      title: '[TESTE] Verificar saldo de aplicações antes de concluir análise', content: '[TESTE] Empresa possui CDB e LCI que precisam de conciliação mensal. Banco: Bradesco.',  pinned: true,  archived: false },
      { companyId: cOmega.id,     title: '[TESTE] Observações sobre custo de produção',               content: '[TESTE] Utilizar planilha específica para rateio de custos industriais. Ver pasta compartilhada na rede.', pinned: false, archived: false },
      { companyId: cSigma.id,     title: '[TESTE] Contrato de aluguel tem reajuste anual em março',   content: '[TESTE] Reajuste pelo IGPM todo mês de março. Verificar valor correto antes de lançar IR Aluguel.', pinned: true,  archived: false },
      { companyId: cDelta.id,     title: '[TESTE] Antiga observação sobre ISS — ARQUIVADA',           content: '[TESTE] Esta anotação foi arquivada após resolução do problema de ISS retido em 2025.', pinned: false, archived: true  },
      { companyId: null,          title: '[TESTE] Lembrete geral de fechamento mensal',               content: '[TESTE] Todo dia 25: verificar todos os clientes com SPED pendente para o ano corrente. Priorizar LR.', pinned: false, archived: false },
      { companyId: cMatriz.id,    title: '[TESTE] Controles especiais do grupo econômico Matriz/Filial', content: '[TESTE] Este grupo possui controladora e subsidiária. Verificar operações intercompany antes de fechar. Atenção às eliminações de lucros não realizados. Empresa tem participação em coligadas externas. Solicitar demonstrações ao cliente para verificar necessidade de equivalência patrimonial. Prazo interno: dia 20 de cada mês. Conferir saldo de empréstimos intercompany antes do SPED.', pinned: false, archived: false },
    ],
  });
  console.log('   ✓ 8 anotações criadas (1 fixada, 1 arquivada, 1 sem empresa, 1 longa)\n');

  // ── 15. LEMBRETES ────────────────────────────────────────────────────────────
  console.log('15. Criando lembretes...');
  await prisma.reminder.createMany({
    data: [
      { companyId: cAlfa.id,      text: '[TESTE] Solicitar extrato bancário atualizado',            remindAt: dateOffset(0),   completed: false },
      { companyId: cBeta.id,      text: '[TESTE] Revisar saldo de ICMS após apuração',              remindAt: dateOffset(3),   completed: false },
      { companyId: cGama.id,      text: '[TESTE] Conferir se guia de ICMS foi paga — VENCIDO',      remindAt: dateOffset(-5),  completed: false },
      { companyId: cDelta.id,     text: '[TESTE] Validar relatório financeiro do segundo trimestre', remindAt: dateOffset(20),  completed: false },
      { companyId: cOmega.id,     text: '[TESTE] Enviar relatório de MIT para aprovação',           remindAt: dateOffset(-3),  completed: true, completedAt: dateOffset(-2) },
      { companyId: cSigma.id,     text: '[TESTE] Confirmar e-mail com dados do contrato de aluguel', remindAt: null,           completed: true, completedAt: dateOffset(-1) },
      { companyId: null,          text: '[TESTE] Verificar backup do banco de dados do sistema',    remindAt: dateOffset(7),   completed: false },
      { companyId: null,          text: '[TESTE] Atualizar lista de contatos dos clientes — VENCIDO', remindAt: dateOffset(-10), completed: false },
    ],
  });
  console.log('   ✓ 8 lembretes criados (1 vencido sem empresa, 1 concluído sem data)\n');

  // ── RESUMO ───────────────────────────────────────────────────────────────────
  console.log('═══════════════════════════════════════════════════════');
  console.log('✅ Seed de dados de teste concluído com sucesso!\n');
  console.log('Resumo do que foi criado:');
  console.log('  • 5 equipes [TESTE]');
  console.log('  • 8 profissionais [TESTE] (6 ativos, 2 inativos)');
  console.log('  • Tributações: garantidas (Simples, LP, LR, Imunes, Isentas)');
  console.log('  • Níveis: garantidos (Sênior, Pleno, Master, Básico)');
  console.log('  • Anos contábeis: 2025, 2026, 2027 garantidos');
  console.log('  • Prazos: criados para todas as 11 obrigações');
  console.log('  • 15 empresas [TESTE] com cenários variados');
  console.log('  • Status de atividades para meses 1-7 de 2026');
  console.log('  • Histórico de mudanças de status (30+ registros)');
  console.log('  • 6 folgas (passadas, presentes e futuras)');
  console.log('  • 5 metas mensais');
  console.log('  • 7 metas do dia');
  console.log('  • 8 anotações de fechamento');
  console.log('  • 8 lembretes');
  console.log('\nPara limpar: node scripts/clear-test-data.js');
  console.log('═══════════════════════════════════════════════════════\n');
}

main()
  .catch(function(e) { console.error('❌ Erro no seed de teste:', e); process.exit(1); })
  .finally(function() { return prisma.$disconnect(); });
