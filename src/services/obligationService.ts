import prisma from '@/lib/prisma';

const DEFAULT_OBLIGATIONS = [
  { code: 'dp',              name: 'DP',             group: null,     type: 'mensal', order: 1  },
  { code: 'fiscal_simples',  name: 'Fiscal Simples', group: 'Fiscal', type: 'mensal', order: 2  },
  { code: 'fiscal_icms',     name: 'Fiscal ICMS',    group: 'Fiscal', type: 'mensal', order: 3  },
  { code: 'fiscal_servico',  name: 'Fiscal Serviço', group: 'Fiscal', type: 'mensal', order: 4  },
  { code: 'financeiro',      name: 'Financeiro',     group: null,     type: 'mensal', order: 5  },
  { code: 'analise',         name: 'Análise',        group: null,     type: 'mensal', order: 6  },
  { code: 'revisao',         name: 'Revisão',        group: null,     type: 'mensal', order: 7  },
  { code: 'ir_aluguel',      name: 'IR Aluguel',     group: null,     type: 'mensal', order: 8  },
  { code: 'mit',             name: 'MIT',            group: null,     type: 'mensal', order: 9  },
  { code: 'sped_ecd',        name: 'SPED ECD',       group: 'SPED',   type: 'anual',  order: 10 },
  { code: 'sped_ecf',        name: 'SPED ECF',       group: 'SPED',   type: 'anual',  order: 11 },
];

// Garante as obrigações padrão sem sobrescrever nada já existente — necessário
// porque o banco pode ter sido migrado/provisionado sem rodar `prisma db seed`,
// deixando a aba de Prazos sem nenhuma obrigação para configurar.
async function ensureDefaultObligations() {
  const count = await prisma.obligation.count();
  if (count > 0) return;
  for (const ob of DEFAULT_OBLIGATIONS) {
    await prisma.obligation.upsert({
      where: { code: ob.code },
      update: {},
      create: { ...ob, isDefault: true, active: true },
    });
  }
}

export async function getObligations(activeOnly = false) {
  await ensureDefaultObligations();
  return prisma.obligation.findMany({
    where: activeOnly ? { active: true } : undefined,
    include: { deadlines: true },
    orderBy: { order: 'asc' },
  });
}
