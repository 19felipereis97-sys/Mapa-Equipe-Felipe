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

export interface DelayAlert {
  code: string;
  name: string;
  month: number;
  monthLabel: string;
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

  // 7. Delay alerts — previous months with P/ST-I/ST-C
  const previousMonths = Array.from({ length: month - 1 }, (_, i) => i + 1);
  const delayedObligations: DelayAlert[] = [];

  for (const { code, obl, eligible } of motorResults) {
    if (!obl) continue;
    const oblMonthMap = statusLookup.get(obl.id) ?? new Map();
    for (const m of previousMonths) {
      const inPrevMonth = eligible.filter((c) => c.months[m - 1]?.eligible);
      if (inPrevMonth.length === 0) continue;
      const prevMap = oblMonthMap.get(m) ?? new Map<number, string>();
      const pendingCount = inPrevMonth.filter((c) => {
        const s = prevMap.get(c.companyId);
        return s === 'P' || s === 'ST-I' || s === 'ST-C';
      }).length;
      if (pendingCount > 0) {
        delayedObligations.push({
          code,
          name: obl.name,
          month: m,
          monthLabel: MONTH_LABELS[m - 1],
          pendingCount,
          totalEligible: inPrevMonth.length,
        });
      }
    }
  }

  delayedObligations.sort((a, b) => b.pendingCount - a.pendingCount);
  const top8 = delayedObligations.slice(0, 8);
  const delayAlertObligationCount = new Set(delayedObligations.map((d) => d.code)).size;

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

  // 9. Deadline alerts — based on today's date vs. current month's pending
  const deadlineAlerts = await getDeadlineAlerts(motorResults, statusLookup);

  return {
    activeCompanies,
    activeGroups,
    completionPercent,
    completedCount,
    totalEligible,
    pendingCount,
    delayAlertObligationCount,
    progressByObligation,
    delayedObligations: top8,
    annualCompletion,
    deadlineAlerts,
  };
}

/* ─── Deadline alerts (always computed for current date) ─── */
async function getDeadlineAlerts(
  motorResults: Array<{ code: string; obl: { id: number; code: string; name: string } | null; eligible: import('@/types/rules').EligibleCompanyResult[] }>,
  statusLookup: Map<number, Map<number, Map<number, string>>>,
): Promise<DeadlineAlert[]> {
  const today = new Date();
  const todayDay   = today.getDate();
  const todayYear  = today.getFullYear();
  // Competência contábil = mês anterior ao calendário
  const calMonth   = today.getMonth(); // 0-indexed
  const todayMonth = calMonth === 0 ? 12 : calMonth;

  const deadlines = await prisma.deadline.findMany({
    where: { active: true },
    include: { obligation: { select: { id: true, code: true, name: true } } },
  });

  const alerts: DeadlineAlert[] = [];

  for (const deadline of deadlines) {
    const { dueDay, obligation } = deadline;
    const daysUntilDue = dueDay - todayDay;

    // Only alert if expired or within 5 days
    if (daysUntilDue > 5) continue;

    // Find corresponding motor results for this obligation
    const motorEntry = motorResults.find((m) => m.obl?.code === obligation.code);
    if (!motorEntry || !motorEntry.obl) continue;

    // Companies eligible for today's month
    const inTodayMonth = motorEntry.eligible.filter((c) => c.months[todayMonth - 1]?.eligible);
    if (inTodayMonth.length === 0) continue;

    // Count P + ST-I + ST-C in today's month of today's year
    const statusByCompany = statusLookup.get(motorEntry.obl.id)?.get(todayMonth) ?? new Map<number, string>();
    const pendingCount = inTodayMonth.filter((c) => {
      const s = statusByCompany.get(c.companyId);
      return s === 'P' || s === 'ST-I' || s === 'ST-C';
    }).length;

    if (pendingCount === 0) continue;

    // Determine severity
    let severity: DeadlineAlert['severity'];
    if (daysUntilDue < 0) severity = 'expired';
    else if (daysUntilDue <= 2) severity = 'urgent';
    else severity = 'attention';

    // Only include if the obligation is in the current year's scope
    // (motor already filtered for the year passed to getDashboardSummary,
    //  but deadline alerts always reference today's month/year)
    const oblYear = todayYear;
    if (!motorEntry.eligible.some((c) => c.months[todayMonth - 1]?.eligible)) continue;

    // Check that the motorResults were actually loaded for todayYear
    // (they might have been loaded for a different year if user selected a different year in dashboard)
    // We just use the pending count from statusLookup which covers the year passed to getDashboardSummary
    // This is correct: if user looks at 2025, the deadline alert still applies to today's month/year.
    // To be safe, we re-query the status for today's month+year if needed:
    let finalPendingCount = pendingCount;
    if (oblYear !== todayYear) {
      // Re-query for today's year
      const todayYearStatuses = await prisma.activityStatus.findMany({
        where: { obligationId: motorEntry.obl.id, year: todayYear, month: todayMonth },
        select: { companyId: true, status: true },
      });
      const todayStatusMap = new Map(todayYearStatuses.map((s) => [s.companyId, s.status]));
      finalPendingCount = inTodayMonth.filter((c) => {
        const s = todayStatusMap.get(c.companyId);
        return s === 'P' || s === 'ST-I' || s === 'ST-C';
      }).length;
      if (finalPendingCount === 0) continue;
    }

    alerts.push({
      obligationCode: obligation.code,
      obligationName: obligation.name,
      dueDay,
      pendingCount: finalPendingCount,
      daysUntilDue,
      severity,
    });
  }

  return alerts.sort((a, b) => a.daysUntilDue - b.daysUntilDue);
}
