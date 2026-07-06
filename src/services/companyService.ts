import prisma from '@/lib/prisma';
import { invalidateCompanyCache, invalidateEligibilityCache } from './obligationRulesService';

const INCLUDE = {
  level: true,
  financialResponsible: true,
  dpResponsible: true,
  fiscalResponsible: true,
  analysisResponsible: true,
  reviewResponsible: true,
  irRentResponsible: true,
  mitResponsible: true,
  cellTeam: true,
  taxRegimes: {
    include: { accountingYear: true, taxRegime: true },
    orderBy: { accountingYear: { year: 'desc' as const } },
  },
} as const;

export async function listCompanies(options?: { includeTerminated?: boolean; onlyTerminated?: boolean }) {
  const where = options?.onlyTerminated
    ? { terminated: true }
    : options?.includeTerminated
      ? {}
      : { terminated: false };

  return prisma.company.findMany({
    where,
    include: INCLUDE,
    orderBy: [{ groupName: 'asc' }, { corporateName: 'asc' }],
  });
}

export async function getCompanyById(id: number) {
  return prisma.company.findUniqueOrThrow({ where: { id }, include: INCLUDE });
}

interface TaxRegimeInput {
  accountingYearId: number;
  taxRegimeId: number;
}

interface CompanyInput {
  code?: string | null;
  groupName?: string | null;
  document?: string | null;
  corporateName: string;
  companyType?: string | null;
  unit?: string | null;
  startCompetence?: string | null;
  levelId?: number | null;
  operationService?: boolean;
  operationCommerce?: boolean;
  operationIndustry?: boolean;
  irRent?: boolean;
  openingCompany?: boolean;
  openingDate?: string | null;
  financialResponsibleId?: number | null;
  dpResponsibleId?: number | null;
  fiscalResponsibleId?: number | null;
  analysisResponsibleId?: number | null;
  reviewResponsibleId?: number | null;
  irRentResponsibleId?: number | null;
  mitResponsibleId?: number | null;
  cellTeamId?: number | null;
  cell?: string | null;
  terminated?: boolean;
  terminationMonth?: string | null;
  taxRegimes?: TaxRegimeInput[];
}

async function saveTaxRegimes(companyId: number, regimes: TaxRegimeInput[]) {
  await prisma.companyTaxRegime.deleteMany({ where: { companyId } });
  if (regimes.length > 0) {
    for (const r of regimes) {
      await prisma.companyTaxRegime.create({
        data: { companyId, accountingYearId: r.accountingYearId, taxRegimeId: r.taxRegimeId },
      });
    }
  }
}

async function checkDocumentDuplicate(document: string, excludeId?: number): Promise<void> {
  const clean = document.replace(/\D/g, '');
  if (!clean) return;
  const existing = await prisma.company.findFirst({
    where: { document: clean, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { corporateName: true },
  });
  if (existing) throw new Error(`CNPJ/CPF já cadastrado para "${existing.corporateName}"`);
}

export async function createCompany(data: CompanyInput) {
  const { taxRegimes, ...fields } = data;
  if (fields.document) await checkDocumentDuplicate(fields.document);
  const company = await prisma.company.create({ data: fields as Parameters<typeof prisma.company.create>[0]['data'] });
  if (taxRegimes && taxRegimes.length > 0) await saveTaxRegimes(company.id, taxRegimes);
  invalidateCompanyCache();
  await invalidateEligibilityCache();
  return prisma.company.findUniqueOrThrow({ where: { id: company.id }, include: INCLUDE });
}

export async function updateCompany(id: number, data: Partial<CompanyInput>) {
  const { taxRegimes, ...fields } = data;
  if (fields.document) await checkDocumentDuplicate(fields.document, id);
  await prisma.company.update({ where: { id }, data: fields as Parameters<typeof prisma.company.update>[0]['data'] });
  if (taxRegimes !== undefined) await saveTaxRegimes(id, taxRegimes);
  invalidateCompanyCache();
  await invalidateEligibilityCache();
  return prisma.company.findUniqueOrThrow({ where: { id }, include: INCLUDE });
}

export async function deleteCompany(id: number) {
  await prisma.company.delete({ where: { id } });
  invalidateCompanyCache();
  await invalidateEligibilityCache();
}

export async function deleteCompanies(ids: number[]) {
  await prisma.company.deleteMany({ where: { id: { in: ids } } });
  invalidateCompanyCache();
  await invalidateEligibilityCache();
}

export async function revertTermination(id: number) {
  const result = await updateCompany(id, { terminated: false, terminationMonth: null });
  invalidateCompanyCache();
  await invalidateEligibilityCache();
  return result;
}

export async function duplicateCompany(id: number) {
  const original = await prisma.company.findUniqueOrThrow({
    where: { id },
    include: { taxRegimes: true },
  });

  const {
    id: _id, corporateName, terminated, terminationMonth,
    createdAt, updatedAt, taxRegimes,
    ...rest
  } = original;

  const copy = await prisma.company.create({
    data: { ...rest, corporateName: `${corporateName} (Cópia)`, terminated: false, terminationMonth: null },
  });

  if (taxRegimes.length > 0) {
    for (const tr of taxRegimes) {
      await prisma.companyTaxRegime.create({
        data: { companyId: copy.id, accountingYearId: tr.accountingYearId, taxRegimeId: tr.taxRegimeId },
      });
    }
  }

  return prisma.company.findUniqueOrThrow({ where: { id: copy.id }, include: INCLUDE });
}
