export interface GClickTask {
  id: number;
  sourceKey: string;
  status: string;
  department: string;
  subject: string;
  competence: string;
  competenceSort: number | null;
  clientCode: string | null;
  clientName: string;
  clientStatus: string | null;
  action: string | null;
  goal: string | null;
  dueDate: string | null;
  dueDateRaw: string | null;
  completed: boolean;
  completedAt: string | null;
  completedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export type Urgency = 'overdue' | 'today' | 'soon' | 'ok';

// Hierarquia derivada no client a partir da lista plana de GClickTask —
// Assunto → Cliente → Competência (nunca um card por linha/competência).
export interface GClickCompetenceGroup {
  competence: string;
  competenceSort: number | null;
  tasks: GClickTask[];
  earliestDueDate: string | null;
  urgency: Urgency;
}

export interface GClickClientGroup {
  clientCode: string | null;
  clientName: string;
  clientStatus: string | null;
  competences: GClickCompetenceGroup[];
  taskCount: number;
  earliestDueDate: string | null;
  urgency: Urgency;
}

export interface GClickSubjectGroup {
  subject: string;
  department: string;
  clients: GClickClientGroup[];
  clientCount: number;
  competenceCount: number;
  taskCount: number;
  earliestDueDate: string | null;
  latestDueDate: string | null;
  urgency: Urgency;
  overdueCount: number;
}
