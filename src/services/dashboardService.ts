import prisma from '@/lib/prisma';
import { getEligibleCompaniesForObligation } from '@/services/obligationRulesService';

/* ─── Monthly obligation codes handled by the Dashboard ─── */
const MONTHLY_OBL_CODES = [
  'dp', 'fiscal_simples', 'fiscal_icms', 'fiscal_servico',
  'financeiro', 'analise', 'revisao', 'ir_aluguel', 'mit',
] as const;

export type MonthlyOblCode = typeof MONTHLY_OBL_CODES[number];

/* ─── Types ─── */
export interface ObligationProgress {
  code: string;
  name: string;
  totalEligible: number;
  okCount: number;
  smCount: number;
  pCount: number;
  stiCount: number;
  stcCount: number;
  completionPercent: number;
}

// One row per obligation — only the single month right before the one selected
// in the Dashboard filter (not accumulated all the way back to January).
export interface DelayAlert {
  code: string;
  name: string;
  pendingCount: number;
  totalEligible: number;
}

export interface AnnualPoint {
  month: number;
  label: string;
  count: number;
}

export interface DeadlineAlert {
  obligationCode: string;
  obligationName: string;
  taxRegimeId: number | null;
  taxRegimeName: string | null;  // set when the deadline is regime-specific (Financeiro/Análise)
  dueDay: number;
  pendingCount: number;   // P + ST-I + ST-C
  daysUntilDue: number;   // negative = overdue
  severity: 'expired' | 'urgent' | 'attention';
}

export interface DashboardSummary {
  activeCompanies: number;
  activeGroups: number;
  completionPercent: number;
  completedCount: number;
  totalEligible: number;
  pendingCount: number;
  delayAlertObligationCount: number;
  progressByObligation: ObligationProgress[];
  delayedObligations: DelayAlert[];
  delayedObligationsMonth: number | null;
  delayedObligationsMonthLabel: string | null;
  annualCompletion: AnnualPoint[];
  deadlineAlerts: DeadlineAlert[];
}

const MONTH_LABELS = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'] as const;

/* ─── Main function ─── */
export async function getDashboardSummary(month: number, year: number): Promise<DashboardSummary> {
  // 1. Active companies + groups
  const companies = await prisma.company.findMany({
    where: { terminated: false },
    select: { id: true, groupName: true },
  });
  const activeCompanies = companies.length;
  const activeGroups    = new Set(companies.map((c) => c.groupName).filter(Boolean)).size;

  // 2. Resolve obligation IDs once
  const oblRecords = await prisma.obligation.findMany({
    where: { code: { in: [...MONTHLY_OBL_CODES] } },
    select: { id: true, code: true, name: true },
  });
  const oblById   = new Map(oblRecords.map((o) => [o.id, o]));
  const oblByCode = new Map(oblRecords.map((o) => [o.code, o]));

  // 3. Run motor for all obligations in parallel
  const motorResults = await Promise.all(
    MONTHLY_OBL_CODES.map(async (code) => {
      const obl = oblByCode.get(code);
      if (!obl) return { code, obl: null, eligible: [] };
      try {
        const eligible = await getEligibleCompaniesForObligation({ obligationCode: code, year, includeTerminated: false });
        return { code, obl, eligible };
      } catch {
        return { code, obl, eligible: [] };
      }
    })
  );

  // 4. Load all ActivityStatus for this year (all monthly obligations) in one query
  const allOblIds = oblRecords.map((o) => o.id);
  const allStatuses = await prisma.activityStatus.findMany({
    where: { obligationId: { in: allOblIds }, year, month: { gte: 1, lte: 12 } },
    select: { companyId: true, obligationId: true, month: true, status: true },
  });

  // Build lookup: obligationId → month → companyId → status
  type StatusLookup = Map<number, Map<number, Map<number, string>>>;
  const statusLookup: StatusLookup = new Map();
  for (const s of allStatuses) {
    if (!statusLookup.has(s.obligationId)) statusLookup.set(s.obligationId, new Map());
    const byMonth = statusLookup.get(s.obligationId)!;
    if (!byMonth.has(s.month)) byMonth.set(s.month, new Map());
    byMonth.get(s.month)!.set(s.companyId, s.status);
  }

  // 5. Progress by obligation (for selected month)
  const progressByObligation: ObligationProgress[] = [];

  for (const { code, obl, eligible } of motorResults) {
    if (!obl) continue;

    // Companies eligible for this month (not blocked)
    const inMonth = eligible.filter((c) => c.months[month - 1]?.eligible);
    if (inMonth.length === 0) continue;

    const monthMap = statusLookup.get(obl.id)?.get(month) ?? new Map<number, string>();
    let okCount = 0, smCount = 0, pCount = 0, stiCount = 0, stcCount = 0;
    for (const c of inMonth) {
      const st = monthMap.get(c.companyId);
      if (st === 'OK')   okCount++;
      else if (st === 'S/M') smCount++;
      else if (st === 'P')   pCount++;
      else if (st === 'ST-I') stiCount++;
      else if (st === 'ST-C') stcCount++;
    }

    progressByObligation.push({
      code,
      name: obl.name,
      totalEligible: inMonth.length,
      okCount, smCount, pCount, stiCount, stcCount,
      completionPercent: Math.round((okCount + smCount) / inMonth.length * 100),
    });
  }

  // 6. Overall KPIs
  const totalEligible = progressByObligation.reduce((s, o) => s + o.totalEligible, 0);
  const completedCount = progressByObligation.reduce((s, o) => s + o.okCount + o.smCount, 0);
  const pendingCount   = progressByObligation.reduce((s, o) => s + o.pCount, 0);
  const completionPercent = totalEligible > 0 ? Math.round(completedCount / totalEligible * 100) : 0;

  // 7. Delay alerts — one row per obligation, only for the single month right
  // before the one selected (not accumulated all the way back to January).
  const prevMonth = month - 1;
  const delayedObligations: DelayAlert[] = [];

  if (prevMonth >= 1) {
    for (const { code, obl, eligible } of motorResults) {
      if (!obl) continue;
      const inPrevMonth = eligible.filter((c) => c.months[prevMonth - 1]?.eligible);
      if (inPrevMonth.length === 0) continue;
      const prevMap = statusLookup.get(obl.id)?.get(prevMonth) ?? new Map<number, string>();
      const pendingCount = inPrevMonth.filter((c) => {
        const s = prevMap.get(c.companyId);
        return s === 'P' || s === 'ST-I' || s === 'ST-C';
      }).length;
      if (pendingCount > 0) {
        delayedObligations.push({ code, name: obl.name, pendingCount, totalEligible: inPrevMonth.length });
      }
    }
  }

  delayedObligations.sort((a, b) => b.pendingCount - a.pendingCount);
  const delayAlertObligationCount = delayedObligations.length;
  const delayedObligationsMonth = prevMonth >= 1 ? prevMonth : null;
  const delayedObligationsMonthLabel = prevMonth >= 1 ? MONTH_LABELS[prevMonth - 1] : null;

  // 8. Annual completion (OK+S/M per month across all monthly obligations)
  const annualCompletion: AnnualPoint[] = MONTH_LABELS.map((label, i) => {
    const m = i + 1;
    let count = 0;
    for (const { obl, eligible } of motorResults) {
      if (!obl) continue;
      const inM = eligible.filter((c) => c.months[i]?.eligible);
      const mMap = statusLookup.get(obl.id)?.get(m) ?? new Map<number, string>();
      count += inM.filter((c) => {
        const st = mMap.get(c.companyId);
        return st === 'OK' || st === 'S/M';
      }).length;
    }
    return { month: m, label, count };
  });

  // 9. Deadline alerts — based on real calendar due dates vs. the selected month's pending
  const deadlineAlerts = await getDeadlineAlerts(motorResults, statusLookup, month, year);

  return {
    activeCompanies,
    activeGroups,
    completionPercent,
    completedCount,
    totalEligible,
    pendingCount,
    delayAlertObligationCount,
    progressByObligation,
    delayedObligations,
    delayedObligationsMonth,
    delayedObligationsMonthLabel,
    annualCompletion,
    deadlineAlerts,
  };
}

/* ─── Deadline alerts (cross-referenced against the selected month/year) ──────
   Each obligation normally has one "general" deadline (taxRegimeId = null).
   Financeiro/Análise may additionally have one deadline per tax regime, which
   takes precedence over the general one for companies on that regime — so a
   single obligation can surface more than one alert card (different due days).

   dueDay always falls in the calendar month right after the competência month
   being viewed (e.g. competência Maio is due in June), so "days until due" is
   computed against that real calendar date — not always today's real month.
   This makes "vencido"/"urgente"/"atenção" reflect whichever month/year is
   selected in the Dashboard filter, including past periods (always expired)
   and the real current period (precise day-by-day countdown, as before).
──────────────────────────────────────────────────────────────────────────── */
async function getDeadlineAlerts(
  motorResults: Array<{ code: string; obl: { id: number; code: string; name: string } | null; eligible: import('@/types/rules').EligibleCompanyResult[] }>,
  statusLookup: Map<number, Map<number, Map<number, string>>>,
  month: number,
  year: number,
): Promise<DeadlineAlert[]> {
  const today = new Date();
  const dueCalMonth = month === 12 ? 1 : month + 1; // 1-indexed calendar month
  const dueCalYear  = month === 12 ? year + 1 : year;

  const deadlines = await prisma.deadline.findMany({
    where: { active: true },
    include: {
      obligation: { select: { id: true, code: true, name: true } },
      taxRegime: { select: { id: true, name: true } },
    },
  });

  const deadlinesByObligation = new Map<number, typeof deadlines>();
  for (const d of deadlines) {
    if (!deadlinesByObligation.has(d.obligationId)) deadlinesByObligation.set(d.obligationId, []);
    deadlinesByObligation.get(d.obligationId)!.push(d);
  }

  const alerts: DeadlineAlert[] = [];

  for (const deadlineGroup of Array.from(deadlinesByObligation.values())) {
    const { obligation } = deadlineGroup[0];
    const motorEntry = motorResults.find((m) => m.obl?.code === obligation.code);
    if (!motorEntry || !motorEntry.obl) continue;

    // Companies eligible for the selected competência month
    const inMonth = motorEntry.eligible.filter((c) => c.months[month - 1]?.eligible);
    if (inMonth.length === 0) continue;

    const statusByCompany = statusLookup.get(motorEntry.obl.id)?.get(month) ?? new Map<number, string>();

    const general = deadlineGroup.find((d) => d.taxRegimeId === null) ?? null;
    const byRegimeId = new Map(deadlineGroup.filter((d) => d.taxRegimeId !== null).map((d) => [d.taxRegimeId as number, d]));

    // Bucket companies by whichever deadline actually applies to them
    const buckets = new Map<number, { deadline: typeof deadlineGroup[number]; companies: typeof inMonth }>();
    for (const c of inMonth) {
      const regimeId = c.taxRegime?.id ?? null;
      const applicable = (regimeId !== null ? byRegimeId.get(regimeId) : undefined) ?? general;
      if (!applicable) continue;
      if (!buckets.has(applicable.id)) buckets.set(applicable.id, { deadline: applicable, companies: [] });
      buckets.get(applicable.id)!.companies.push(c);
    }

    for (const { deadline, companies } of Array.from(buckets.values())) {
      const dueDate = new Date(dueCalYear, dueCalMonth - 1, deadline.dueDay);
      const daysUntilDue = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
      if (daysUntilDue > 5) continue; // only alert if expired or within 5 days (future periods are naturally skipped here)

      const pendingCount = companies.filter((c) => {
        const s = statusByCompany.get(c.companyId);
        return s === 'P' || s === 'ST-I' || s === 'ST-C';
      }).length;
      if (pendingCount === 0) continue;

      let severity: DeadlineAlert['severity'];
      if (daysUntilDue < 0) severity = 'expired';
      else if (daysUntilDue <= 2) severity = 'urgent';
      else severity = 'attention';

      alerts.push({
        obligationCode: obligation.code,
        obligationName: obligation.name,
        taxRegimeId: deadline.taxRegimeId,
        taxRegimeName: deadline.taxRegime?.name ?? null,
        dueDay: deadline.dueDay,
        pendingCount,
        daysUntilDue,
        severity,
      });
    }
  }

  return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}
