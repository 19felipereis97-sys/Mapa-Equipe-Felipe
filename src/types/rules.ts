export interface MonthInfo {
  month: number;
  label: string;
  eligible: boolean;
  blocked: boolean;
  blockReason: 'inicio_competencia' | 'rescisao' | null;
}

export interface EligibleCompanyResult {
  companyId: number;
  code: string | null;
  groupName: string | null;
  corporateName: string;
  document: string | null;
  companyType: string | null;
  level: { id: number; name: string; color: string | null } | null;
  taxRegime: { id: number; name: string; color: string | null } | null;
  taxRegimeConsideredYear: number;
  responsible: { id: number; name: string } | null;
  startCompetence: string | null;
  terminated: boolean;
  terminationMonth: string | null;
  operationService: boolean;
  operationCommerce: boolean;
  operationIndustry: boolean;
  irRent: boolean;
  months: MonthInfo[];
  isAnnual: boolean;
  eligibleMonthsCount: number;
  blockedMonthsCount: number;
}

export interface EligibilityParams {
  obligationCode: string;
  year: number;
  includeTerminated?: boolean;
  onlyTerminated?: boolean;
}

export interface StatusMeta {
  code: string;
  label: string;
  type: 'concluido' | 'concluido_sem_movimento' | 'pendencia' | 'standby_interno' | 'standby_cliente' | 'aberto';
  requiresObservation: boolean;
}

export const ANNUAL_OBLIGATIONS = ['sped_ecd', 'sped_ecf'] as const;

export const MONTH_LABELS = [
  'JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN',
  'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ',
] as const;
