import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DEFAULT_OBLIGATIONS = [
  { code: 'dp',                 name: 'DP',                   group: null,   type: 'mensal', order: 1  },
  { code: 'fiscal_simples',     name: 'Fiscal Simples',       group: 'Fiscal', type: 'mensal', order: 2 },
  { code: 'fiscal_icms',        name: 'Fiscal ICMS',          group: 'Fiscal', type: 'mensal', order: 3 },
  { code: 'fiscal_servico',     name: 'Fiscal Serviço',       group: 'Fiscal', type: 'mensal', order: 4 },
  { code: 'financeiro',         name: 'Financeiro',           group: null,   type: 'mensal', order: 5  },
  { code: 'analise',            name: 'Análise',              group: null,   type: 'mensal', order: 6  },
  { code: 'revisao',            name: 'Revisão',              group: null,   type: 'mensal', order: 7  },
  { code: 'distribuicao_lucros',name: 'Distribuição de Lucros', group: null,  type: 'mensal', order: 8  },
  { code: 'ir_aluguel',         name: 'IR Aluguel',           group: null,   type: 'mensal', order: 9  },
  { code: 'mit',                name: 'MIT',                  group: null,   type: 'mensal', order: 10 },
  { code: 'cotas_irpj_csll',    name: 'Cotas IRPJ/CSLL',      group: null,   type: 'mensal', order: 11 },
  { code: 'sped_ecd',           name: 'SPED ECD',             group: 'SPED', type: 'anual',  order: 12 },
  { code: 'sped_ecf',           name: 'SPED ECF',             group: 'SPED', type: 'anual',  order: 13 },
];

async function main() {
  for (const ob of DEFAULT_OBLIGATIONS) {
    await prisma.obligation.upsert({
      where: { code: ob.code },
      // Re-assert the canonical display fields every run — these aren't user-editable
      // anywhere in the UI, so it's safe, and it's what lets reordering (e.g. inserting
      // a new obligation between two existing ones) actually reach an existing DB.
      update: { name: ob.name, group: ob.group, type: ob.type, order: ob.order },
      create: {
        code: ob.code,
        name: ob.name,
        group: ob.group,
        type: ob.type,
        order: ob.order,
        isDefault: true,
        active: true,
      },
    });
  }

  const count = await prisma.accountingYear.count();
  if (count === 0) {
    await prisma.accountingYear.create({
      data: { year: new Date().getFullYear(), active: true },
    });
  }

  console.log('Seed concluído.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
