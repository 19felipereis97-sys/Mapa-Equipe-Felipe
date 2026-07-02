import type { GClickTask, GClickSubjectGroup, GClickClientGroup, GClickCompetenceGroup, Urgency } from '@/types/gclick';

export function computeUrgency(dueDate: string | null): Urgency {
  if (!dueDate) return 'ok';
  const due = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  due.setHours(0, 0, 0, 0);
  const diffDays = Math.round((due.getTime() - today.getTime()) / 86400000);
  if (diffDays < 0) return 'overdue';
  if (diffDays === 0) return 'today';
  if (diffDays <= 3) return 'soon';
  return 'ok';
}

function earliestOf(dates: (string | null)[]): string | null {
  const valid = dates.filter((d): d is string => !!d);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (new Date(a) < new Date(b) ? a : b));
}

function latestOf(dates: (string | null)[]): string | null {
  const valid = dates.filter((d): d is string => !!d);
  if (valid.length === 0) return null;
  return valid.reduce((a, b) => (new Date(a) > new Date(b) ? a : b));
}

function clientKey(t: GClickTask): string {
  return t.clientCode ?? `name:${t.clientName}`;
}

// Monta a hierarquia Assunto → Cliente → Competência a partir da lista plana
// de tarefas. Tarefas concluídas são filtradas antes de agrupar — assim, ao
// concluir a última tarefa de um cliente (individualmente ou via "Concluir
// Cliente"), ele some sozinho da tela, e o mesmo cascateia para o Assunto
// quando todos os seus clientes ficam vazios, sem lógica extra de remoção.
export function buildSubjectGroups(tasks: GClickTask[]): GClickSubjectGroup[] {
  const pending = tasks.filter((t) => !t.completed);

  const bySubject = new Map<string, GClickTask[]>();
  for (const t of pending) {
    if (!bySubject.has(t.subject)) bySubject.set(t.subject, []);
    bySubject.get(t.subject)!.push(t);
  }

  const groups: GClickSubjectGroup[] = [];

  for (const [subject, subjectTasks] of Array.from(bySubject)) {
    const byClient = new Map<string, GClickTask[]>();
    for (const t of subjectTasks) {
      const key = clientKey(t);
      if (!byClient.has(key)) byClient.set(key, []);
      byClient.get(key)!.push(t);
    }

    const clients: GClickClientGroup[] = [];
    for (const clientTasks of Array.from(byClient.values())) {
      const byCompetence = new Map<string, GClickTask[]>();
      for (const t of clientTasks) {
        if (!byCompetence.has(t.competence)) byCompetence.set(t.competence, []);
        byCompetence.get(t.competence)!.push(t);
      }

      const competences: GClickCompetenceGroup[] = Array.from(byCompetence.entries()).map(([competence, cTasks]) => {
        const earliest = earliestOf(cTasks.map((t) => t.dueDate));
        return {
          competence,
          competenceSort: cTasks[0].competenceSort,
          tasks: cTasks,
          earliestDueDate: earliest,
          urgency: computeUrgency(earliest),
        };
      });

      competences.sort((a, b) => {
        if (a.competenceSort !== null && b.competenceSort !== null) return a.competenceSort - b.competenceSort;
        if (a.competenceSort !== null) return -1;
        if (b.competenceSort !== null) return 1;
        return a.competence.localeCompare(b.competence);
      });

      const first = clientTasks[0];
      const earliest = earliestOf(clientTasks.map((t) => t.dueDate));

      clients.push({
        clientCode: first.clientCode,
        clientName: first.clientName,
        clientStatus: first.clientStatus,
        competences,
        taskCount: clientTasks.length,
        earliestDueDate: earliest,
        urgency: computeUrgency(earliest),
      });
    }

    clients.sort((a, b) => {
      if (a.earliestDueDate && b.earliestDueDate) return new Date(a.earliestDueDate).getTime() - new Date(b.earliestDueDate).getTime();
      if (a.earliestDueDate) return -1;
      if (b.earliestDueDate) return 1;
      return a.clientName.localeCompare(b.clientName);
    });

    const allDue = subjectTasks.map((t) => t.dueDate);
    const earliestDueDate = earliestOf(allDue);
    const overdueCount = subjectTasks.filter((t) => computeUrgency(t.dueDate) === 'overdue').length;

    groups.push({
      subject,
      department: subjectTasks[0].department,
      clients,
      clientCount: clients.length,
      competenceCount: new Set(subjectTasks.map((t) => t.competence)).size,
      taskCount: subjectTasks.length,
      earliestDueDate,
      latestDueDate: latestOf(allDue),
      urgency: computeUrgency(earliestDueDate),
      overdueCount,
    });
  }

  groups.sort((a, b) => {
    if (a.earliestDueDate && b.earliestDueDate) return new Date(a.earliestDueDate).getTime() - new Date(b.earliestDueDate).getTime();
    if (a.earliestDueDate) return -1;
    if (b.earliestDueDate) return 1;
    return a.subject.localeCompare(b.subject);
  });

  return groups;
}
