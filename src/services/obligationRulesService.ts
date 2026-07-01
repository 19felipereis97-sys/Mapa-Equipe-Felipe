import prisma from '@/lib/prisma';
import type {
  EligibilityParams,
  EligibleCompanyResult,
  MonthInfo,
  StatusMeta,
} from '@/types/rules';
import { ANNUAL_OBLIGATIONS, MONTH_LABELS } from '@/types/rules';

/* ─────────────────────────────────────────────────────────────────────────────
   IN-MEMORY COMPANY CACHE
   TTL: 2 min. Shared across all obligation checks — the Dashboard calls
   getEligibleCompaniesForObligation 9× in parallel; the first one populates
   the cache and the remaining 8 get an instant Map lookup instead of 8 more
   heavy Prisma queries.
   Call invalidateCompanyCache() from companyService after any mutation.
───────────────────────────────────────────────────────────────────────────── */

const COMPANY_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

interface CacheEntry { data: unknown[]; expiresAt: number }
const _companyCache = new Map<string, CacheEntry>();

export function invalidateCompanyCache(): void {
  _companyCache.clear();
}

const COMPANY_INCLUDE = {
  level: true,
  financialResponsible: true,
  dpResponsible: true,
  fiscalResponsible: true,
  analysisResponsible: true,
  reviewResponsible: true,
  irRentResponsible: true,
  mitResponsible: true,
  taxRegimes: { include: { accountingYear: true, taxRegime: true } },
} as const;

async function loadCompaniesFromDb(where: { terminated?: boolean }): Promise<unknown[]> {
  const key = where.terminated === true ? 'terminated' : where.terminated === false ? 'active' : 'all';
  const entry = _companyCache.get(key);
  if (entry && entry.expiresAt > Date.now()) return entry.data;

  const data = await prisma.company.findMany({
    where,
    include: COMPANY_INCLUDE,
    orderBy: [{ groupName: 'asc' }, { corporateName: 'asc' }],
  });

  _companyCache.set(key, { data, expiresAt: Date.now() + COMPANY_CACHE_TTL });
  return data;
}

/* ─────────────────────────────────────────────────────────────────────────────
   TYPES (internal Prisma-augmented company shape)
───────────────────────────────────────────────────────────────────────────── */

type LoadedTaxRegime = {
  accountingYearId: number;
  taxRegimeId: number;
  accountingYear: { id: number; year: number; active: boolean };
  taxRegime: { id: number; name: string; color: string | null; active: boolean };
};

type LoadedCompany = {
  id: number;
  code: string | null;
  groupName: string | null;
  document: string | null;
  corporateName: string;
  companyType: string | null;
  startCompetence: string | null;
  levelId: number | null;
  operationService: boolean;
  operationCommerce: boolean;
  operationIndustry: boolean;
  irRent: boolean;
  openingCompany: boolean;
  openingDate: string | null;
  cell: string | null;
  terminated: boolean;
  terminationMonth: string | null;
  level: { id: number; name: string; color: string | null } | null;
  financialResponsible: { id: number; name: string } | null;
  dpResponsible: { id: number; name: string } | null;
  fiscalResponsible: { id: number; name: string } | null;
  analysisResponsible: { id: number; name: string } | null;
  reviewResponsible: { id: number; name: string } | null;
  irRentResponsible: { id: number; name: string } | null;
  mitResponsible: { id: number; name: string } | null;
  taxRegimes: LoadedTaxRegime[];
};

/* ─────────────────────────────────────────────────────────────────────────────
   TAX REGIME HELPERS
───────────────────────────────────────────────────────────────────────────── */

export function getCompanyTaxRegimeForYear(
  company: Pick<LoadedCompany, 'taxRegimes'>,
  year: number
): { id: number; name: string; color: string | null } | null {
  return company.taxRegimes.find((r) => r.accountingYear.year === year)?.taxRegime ?? null;
}

export function getCompanyTaxRegimeForPreviousYear(
  company: Pick<LoadedCompany, 'taxRegimes'>,
  year: number
): { id: number; name: string; color: string | null } | null {
  return getCompanyTaxRegimeForYear(company, year - 1);
}

export function isSimpleTaxRegime(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.toLowerCase().includes('simples');
}

export function isLucroRealTaxRegime(name: string | null | undefined): boolean {
  if (!name) return false;
  return name.toLowerCase().includes('lucro real');
}

/* ─────────────────────────────────────────────────────────────────────────────
   RESPONSIBLE HELPER
───────────────────────────────────────────────────────────────────────────── */

export function getResponsibleForObligation(
  company: LoadedCompany,
  obligationCode: string
): { id: number; name: string } | null {
  const map: Record<string, { id: number; name: string } | null> = {
    dp:             company.dpResponsible,
    fiscal_simples: company.fiscalResponsible,
    fiscal_icms:    company.fiscalResponsible,
    fiscal_servico: company.fiscalResponsible,
    financeiro:     company.financialResponsible,
    analise:        company.analysisResponsible,
    revisao:        company.reviewResponsible,
    ir_aluguel:     company.irRentResponsible,
    mit:            company.mitResponsible,
    sped_ecd:       company.analysisResponsible,
    sped_ecf:       company.analysisResponsible,
    trava_contabil: null,
  };
  return map[obligationCode] ?? null;
}

/* ─────────────────────────────────────────────────────────────────────────────
   MONTH BLOCKING
───────────────────────────────────────────────────────────────────────────── */

function parseMonthYear(value: string | null): { month: number; year: number } | null {
  if (!value) return null;
  const match = value.match(/^(0[1-9]|1[0-2])\/(\d{4})$/);
  if (!match) return null;
  return { month: parseInt(match[1], 10), year: parseInt(match[2], 10) };
}

export function getBlockedMonthsForCompany(company: LoadedCompany, year: number): MonthInfo[] {
  const start = parseMonthYear(company.startCompetence);
  const term  = parseMonthYear(company.terminationMonth);

  return Array.from({ length: 12 }, (_, i) => {
    const m = i + 1;
    let blocked = false;
    let blockReason: MonthInfo['blockReason'] = null;

    // 1. Block by start competence
    if (start) {
      if (start.year > year || (start.year === year && m < start.month)) {
        blocked = true;
        blockReason = 'inicio_competencia';
      }
    }

    // 2. Block by rescission (only if not already blocked by start competence)
    if (!blocked && company.terminated && term) {
      if (term.year < year || (term.year === year && m > term.month)) {
        blocked = true;
        blockReason = 'rescisao';
      }
    }

    return { month: m, label: MONTH_LABELS[i], eligible: !blocked, blocked, blockReason };
  });
}

export function isMonthBlocked(
  company: LoadedCompany,
  year: number,
  month: number
): { blocked: boolean; reason: MonthInfo['blockReason'] } {
  const months = getBlockedMonthsForCompany(company, year);
  const info = months.find((m) => m.month === month);
  return { blocked: info?.blocked ?? false, reason: info?.blockReason ?? null };
}

/* ─────────────────────────────────────────────────────────────────────────────
   ELIGIBILITY CHECK
───────────────────────────────────────────────────────────────────────────── */

export function isCompanyEligibleForObligation(
  company: LoadedCompany,
  obligationCode: string,
  year: number
): boolean {
  const taxName = getCompanyTaxRegimeForYear(company, year)?.name ?? null;

  switch (obligationCode) {
    case 'dp':
    case 'financeiro':
    case 'analise':
    case 'revisao':
    case 'trava_contabil':
      return true;

    case 'fiscal_simples':
      return isSimpleTaxRegime(taxName);

    case 'fiscal_icms':
      return !isSimpleTaxRegime(taxName) && (company.operationCommerce || company.operationIndustry);

    case 'fiscal_servico':
      return !isSimpleTaxRegime(taxName) && company.operationService;

    case 'ir_aluguel':
      return company.irRent;

    case 'mit':
      return isLucroRealTaxRegime(taxName);

    case 'sped_ecd':
    case 'sped_ecf': {
      const prevName = getCompanyTaxRegimeForPreviousYear(company, year)?.name ?? null;
      return !isSimpleTaxRegime(prevName);
    }

    default:
      return false;
  }
}

/* ─────────────────────────────────────────────────────────────────────────────
   STATUS METADATA
───────────────────────────────────────────────────────────────────────────── */

const STATUS_META: Record<string, StatusMeta> = {
  'OK':     { code: 'OK',     label: 'OK',     type: 'concluido',              requiresObservation: false },
  'S/M':    { code: 'S/M',    label: 'S/M',    type: 'concluido_sem_movimento', requiresObservation: false },
  'P':      { code: 'P',      label: 'P',      type: 'pendencia',               requiresObservation: true  },
  'ST-I':   { code: 'ST-I',   label: 'ST-I',   type: 'standby_interno',         requiresObservation: true  },
  'ST-C':   { code: 'ST-C',   label: 'ST-C',   type: 'standby_cliente',         requiresObservation: false },
  'ABERTO': { code: 'ABERTO', label: 'Aberto', type: 'aberto',                  requiresObservation: true  },
};

export function getObligationAvailableStatuses(obligationCode: string): StatusMeta[] {
  const dpFiscal = ['OK', 'S/M', 'P', 'ST-I'];
  const others   = ['OK', 'S/M', 'P', 'ST-C'];
  const sped     = ['OK', 'P'];
  const trava    = ['OK', 'ABERTO'];

  let codes: string[];
  if (obligationCode === 'trava_contabil') {
    codes = trava;
  } else if (['dp', 'fiscal_simples', 'fiscal_icms', 'fiscal_servico'].includes(obligationCode)) {
    codes = dpFiscal;
  } else if (ANNUAL_OBLIGATIONS.includes(obligationCode as typeof ANNUAL_OBLIGATIONS[number])) {
    codes = sped;
  } else {
    codes = others;
  }

  return codes.map((c) => STATUS_META[c]).filter(Boolean);
}

/* ─────────────────────────────────────────────────────────────────────────────
   MAIN FUNCTION — getEligibleCompaniesForObligation
───────────────────────────────────────────────────────────────────────────── */

export async function getEligibleCompaniesForObligation(
  params: EligibilityParams
): Promise<EligibleCompanyResult[]> {
  const { obligationCode, year, includeTerminated = false, onlyTerminated = false } = params;

  const isAnnual = ANNUAL_OBLIGATIONS.includes(obligationCode as typeof ANNUAL_OBLIGATIONS[number]);

  // Build where clause based on termination flags
  const where: { terminated?: boolean } = {};
  if (onlyTerminated) {
    where.terminated = true;
  } else if (!includeTerminated) {
    where.terminated = false;
  }
  // If includeTerminated = true and onlyTerminated = false → no where filter (all companies)

  const companies = (await loadCompaniesFromDb(where)) as LoadedCompany[];

  const results: EligibleCompanyResult[] = [];

  for (const company of companies) {
    if (!isCompanyEligibleForObligation(company, obligationCode, year)) continue;

    const isSpedObligation = ANNUAL_OBLIGATIONS.includes(obligationCode as typeof ANNUAL_OBLIGATIONS[number]);
    const consideredYear = isSpedObligation ? year - 1 : year;
    const taxRegime = getCompanyTaxRegimeForYear(company, consideredYear);
    const responsible = getResponsibleForObligation(company, obligationCode);

    const months = isAnnual ? [] : getBlockedMonthsForCompany(company, year);
    const eligibleMonthsCount = months.filter((m) => m.eligible).length;
    const blockedMonthsCount  = months.filter((m) => m.blocked).length;

    results.push({
      companyId: company.id,
      code: company.code,
      groupName: company.groupName,
      corporateName: company.corporateName,
      document: company.document,
      companyType: company.companyType,
      level: company.level ?? null,
      taxRegime: taxRegime ? { id: taxRegime.id, name: taxRegime.name, color: taxRegime.color ?? null } : null,
      taxRegimeConsideredYear: consideredYear,
      responsible,
      startCompetence: company.startCompetence,
      terminated: company.terminated,
      terminationMonth: company.terminationMonth,
      operationService: company.operationService,
      operationCommerce: company.operationCommerce,
      operationIndustry: company.operationIndustry,
      irRent: company.irRent,
      months,
      isAnnual,
      eligibleMonthsCount,
      blockedMonthsCount,
    });
  }

  return results;
}
