export interface Team {
  id: number;
  name: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Professional {
  id: number;
  name: string;
  teamId: number | null;
  email: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  team: Team | null;
}

export interface TaxRegime {
  id: number;
  name: string;
  color: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

// month: 0 = annual (SPED), 1-12 = monthly
export interface ActivityStatus {
  id: number;
  companyId: number;
  obligationId: number;
  year: number;
  month: number;
  status: string;
  observation: string | null;
  responsibleId: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActivityStatusHistory {
  id: number;
  companyId: number;
  obligationId: number;
  year: number;
  month: number;
  previousStatus: string | null;
  newStatus: string | null;
  observation: string | null;
  responsibleId: number | null;
  createdAt: string;
}

export interface Level {
  id: number;
  name: string;
  color: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Obligation {
  id: number;
  code: string;
  name: string;
  group: string | null;
  type: string;
  order: number;
  isDefault: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  deadlines?: Deadline[];
}

export interface Deadline {
  id: number;
  obligationId: number;
  taxRegimeId: number | null;
  startDay: number | null;
  dueDay: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  obligation?: Obligation;
  taxRegime?: TaxRegime | null;
}

export interface AccountingYear {
  id: number;
  year: number;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CompanyTaxRegime {
  id: number;
  companyId: number;
  accountingYearId: number;
  taxRegimeId: number;
  createdAt: string;
  updatedAt: string;
  accountingYear?: AccountingYear;
  taxRegime?: TaxRegime;
}

export interface Company {
  id: number;
  code: string | null;
  groupName: string | null;
  document: string | null;
  corporateName: string;
  companyType: string | null;
  unit: string | null;
  startCompetence: string | null;
  levelId: number | null;
  operationService: boolean;
  operationCommerce: boolean;
  operationIndustry: boolean;
  irRent: boolean;
  openingCompany: boolean;
  openingDate: string | null;
  financialResponsibleId: number | null;
  dpResponsibleId: number | null;
  fiscalResponsibleId: number | null;
  analysisResponsibleId: number | null;
  reviewResponsibleId: number | null;
  irRentResponsibleId: number | null;
  mitResponsibleId: number | null;
  cellTeamId: number | null;
  cell: string | null;
  terminated: boolean;
  terminationMonth: string | null;
  createdAt: string;
  updatedAt: string;
  level?: Level | null;
  financialResponsible?: Professional | null;
  dpResponsible?: Professional | null;
  fiscalResponsible?: Professional | null;
  analysisResponsible?: Professional | null;
  reviewResponsible?: Professional | null;
  irRentResponsible?: Professional | null;
  mitResponsible?: Professional | null;
  cellTeam?: Team | null;
  taxRegimes?: CompanyTaxRegime[];
}

export interface ClosingNote {
  id: number;
  companyId: number | null;
  title: string;
  content: string;
  pinned: boolean;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  company?: Company | null;
}

export interface Reminder {
  id: number;
  companyId: number | null;
  text: string;
  remindAt: string | null;
  completed: boolean;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  company?: Company | null;
}
