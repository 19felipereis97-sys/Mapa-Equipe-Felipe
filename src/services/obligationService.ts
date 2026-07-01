import prisma from '@/lib/prisma';

const DEFAULT_OBLIGATIONS = [
  { code: 'dp',                  name: 'DP',                     group: null,     type: 'mensal', order: 1  },
  { code: 'fiscal_simples',      name: 'Fiscal Simples',         group: 'Fiscal', type: 'mensal', order: 2  },
  { code: 'fiscal_icms',         name: 'Fiscal ICMS',            group: 'Fiscal', type: 'mensal', order: 3  },
  { code: 'fiscal_servico',      name: 'Fiscal Serviço',         group: 'Fiscal', type: 'mensal', order: 4  },
  { code: 'financeiro',          name: 'Financeiro',             group: null,     type: 'mensal', order: 5  },
  { code: 'analise',             name: 'Análise',                group: null,     type: 'mensal', order: 6  },
  { code: 'revisao',             name: 'Revisão',                group: null,     type: 'mensal', order: 7  },
  { code: 'distribuicao_lucros', name: 'Distribuição de Lucros', group: null,     type: 'mensal', order: 8  },
  { code: 'ir_aluguel',          name: 'IR Aluguel',             group: null,     type: 'mensal', order: 9  },
  { code: 'mit',                 name: 'MIT',                    group: null,     type: 'mensal', order: 10 },
  { code: 'cotas_irpj_csll',     name: 'Cotas IRPJ/CSLL',        group: null,     type: 'mensal', order: 11 },
  { code: 'sped_ecd',            name: 'SPED ECD',               group: 'SPED',   type: 'anual',  order: 12 },
  { code: 'sped_ecf',            name: 'SPED ECF',               group: 'SPED',   type: 'anual',  order: 13 },
];

// Garante que todas as obrigações padrão existem e estão com os campos de exibição
// corretos — necessário tanto para bancos provisionados sem `prisma db seed` quanto
// para quando esta lista ganha itens novos depois que o banco já tinha sido semeado.
// `name`/`group`/`type`/`order` não são editáveis em nenhuma tela, então reafirmá-los
// sempre é seguro; `active` fica de fora para não sobrescrever eventual customização.
async function ensureDefaultObligations() {
  for (const ob of DEFAULT_OBLIGATIONS) {
    await prisma.obligation.upsert({
      where: { code: ob.code },
      update: { name: ob.name, group: ob.group, type: ob.type, order: ob.order },
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
