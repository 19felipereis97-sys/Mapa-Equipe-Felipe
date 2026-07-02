'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { SubjectCard } from '@/components/gclick/SubjectCard';
import { GClickIndicators } from '@/components/gclick/GClickIndicators';
import { ImportGClickDrawer } from '@/components/gclick/ImportGClickDrawer';
import { buildSubjectGroups, computeUrgency } from '@/lib/gclickHierarchy';
import type { GClickTask } from '@/types/gclick';

/* ─── Page ─── */
export default function TarefasGClickPage() {
  const { addToast } = useToast();

  const [tasks, setTasks] = useState<GClickTask[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const [importOpen, setImportOpen] = useState(false);
  const [clearOpen, setClearOpen] = useState(false);
  const [clearing, setClearing] = useState(false);

  const [search, setSearch] = useState('');
  const [filterDepartment, setFilterDepartment] = useState('');
  const [filterCompetence, setFilterCompetence] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClientStatus, setFilterClientStatus] = useState('');
  const [filterDueBucket, setFilterDueBucket] = useState('');
  const [filterSubject, setFilterSubject] = useState('');

  // Animação de "desaparecer" ao concluir — mantém o card visível por um
  // instante com opacity/scale reduzidos antes de efetivamente sumir da tela.
  const [removingSubjects, setRemovingSubjects] = useState<Set<string>>(new Set());
  const [removingClients, setRemovingClients] = useState<Set<string>>(new Set());

  const [confirmSubject, setConfirmSubject] = useState<string | null>(null);
  const [confirmClient, setConfirmClient] = useState<{ subject: string; clientCode: string | null; clientName: string } | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  const load = useCallback(async () => {
    const showInitialLoading = !hasLoadedRef.current;
    if (showInitialLoading) setLoading(true);
    try {
      const res = await fetch('/api/gclick/tasks');
      const json = await res.json();
      setTasks(json.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar tarefas' });
    } finally {
      hasLoadedRef.current = true;
      if (showInitialLoading) setLoading(false);
    }
  }, [addToast]);

  useEffect(() => { load(); }, [load]);

  const pendingTasks = useMemo(() => tasks.filter((t) => !t.completed), [tasks]);

  /* ─── Filter option lists ─── */
  const departments = useMemo(() => Array.from(new Set(pendingTasks.map((t) => t.department))).sort(), [pendingTasks]);
  const competences = useMemo(() => Array.from(new Set(pendingTasks.map((t) => t.competence))).sort(), [pendingTasks]);
  const statuses = useMemo(() => Array.from(new Set(pendingTasks.map((t) => t.status))).sort(), [pendingTasks]);
  const clientStatuses = useMemo(() => Array.from(new Set(pendingTasks.map((t) => t.clientStatus).filter(Boolean) as string[])).sort(), [pendingTasks]);
  const subjects = useMemo(() => Array.from(new Set(pendingTasks.map((t) => t.subject))).sort(), [pendingTasks]);

  const hasFilters = !!(search || filterDepartment || filterCompetence || filterStatus || filterClientStatus || filterDueBucket || filterSubject);

  function clearFiltersOnly() {
    setSearch(''); setFilterDepartment(''); setFilterCompetence(''); setFilterStatus('');
    setFilterClientStatus(''); setFilterDueBucket(''); setFilterSubject('');
  }

  /* ─── Search + filters ─── */
  const filteredTasks = useMemo(() => pendingTasks.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      const hit = [t.clientName, t.clientCode, t.subject, t.competence, t.department, t.status]
        .some((f) => f?.toLowerCase().includes(q));
      if (!hit) return false;
    }
    if (filterDepartment && t.department !== filterDepartment) return false;
    if (filterCompetence && t.competence !== filterCompetence) return false;
    if (filterStatus && t.status !== filterStatus) return false;
    if (filterClientStatus && t.clientStatus !== filterClientStatus) return false;
    if (filterSubject && t.subject !== filterSubject) return false;
    if (filterDueBucket && computeUrgency(t.dueDate) !== filterDueBucket) return false;
    return true;
  }), [pendingTasks, search, filterDepartment, filterCompetence, filterStatus, filterClientStatus, filterSubject, filterDueBucket]);

  const subjectGroups = useMemo(() => buildSubjectGroups(filteredTasks), [filteredTasks]);

  /* ─── Indicators ─── */
  const indicatorsData = useMemo(() => {
    const clientKeys = new Set(filteredTasks.map((t) => `${t.subject}::${t.clientCode ?? t.clientName}`));
    const competenceKeys = new Set(filteredTasks.map((t) => `${t.subject}::${t.clientCode ?? t.clientName}::${t.competence}`));
    const subjectKeys = new Set(filteredTasks.map((t) => t.subject));

    const now = new Date();
    const weekEnd = new Date(now); weekEnd.setDate(weekEnd.getDate() + 7);

    let overdue = 0, dueToday = 0, dueThisWeek = 0;
    for (const t of filteredTasks) {
      const urgency = computeUrgency(t.dueDate);
      if (urgency === 'overdue') overdue++;
      if (urgency === 'today') dueToday++;
      if (t.dueDate) {
        const d = new Date(t.dueDate);
        if (d >= now && d <= weekEnd) dueThisWeek++;
      }
    }

    const bySubjectAll = new Map<string, GClickTask[]>();
    for (const t of tasks) {
      if (!bySubjectAll.has(t.subject)) bySubjectAll.set(t.subject, []);
      bySubjectAll.get(t.subject)!.push(t);
    }
    let subjectsCompleted = 0;
    for (const list of Array.from(bySubjectAll.values())) {
      if (list.length > 0 && list.every((t) => t.completed)) subjectsCompleted++;
    }

    return {
      subjects: subjectKeys.size,
      clients: clientKeys.size,
      competences: competenceKeys.size,
      tasks: filteredTasks.length,
      overdue, dueToday, dueThisWeek,
      subjectsCompleted,
    };
  }, [filteredTasks, tasks]);

  /* ─── Task toggle (individual) ─── */
  async function handleToggleTask(id: number, completed: boolean) {
    const prev = tasks;
    setTasks((cur) => cur.map((t) => (t.id === id ? { ...t, completed, completedAt: completed ? new Date().toISOString() : null } : t)));
    try {
      const res = await fetch(`/api/gclick/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    } catch (e: unknown) {
      setTasks(prev);
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar tarefa' });
    }
  }

  /* ─── Complete subject ─── */
  async function executeCompleteSubject() {
    const subject = confirmSubject!;
    setConfirmBusy(true);
    try {
      const res = await fetch('/api/gclick/tasks/complete-subject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setConfirmSubject(null);
      setConfirmBusy(false);
      setRemovingSubjects((s) => new Set(s).add(subject));
      setTimeout(() => {
        setTasks((cur) => cur.map((t) => (t.subject === subject ? { ...t, completed: true } : t)));
        setRemovingSubjects((s) => { const n = new Set(s); n.delete(subject); return n; });
      }, 280);
      addToast({ type: 'success', message: `${json.data.count} tarefa(s) concluída(s) em "${subject}"` });
    } catch (e: unknown) {
      setConfirmBusy(false);
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao concluir assunto' });
    }
  }

  /* ─── Complete client ─── */
  async function executeCompleteClient() {
    const target = confirmClient!;
    setConfirmBusy(true);
    try {
      const res = await fetch('/api/gclick/tasks/complete-client', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(target),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setConfirmClient(null);
      setConfirmBusy(false);
      const key = `${target.subject}::${target.clientCode ?? target.clientName}`;
      setRemovingClients((s) => new Set(s).add(key));
      setTimeout(() => {
        setTasks((cur) => cur.map((t) => (
          t.subject === target.subject && (t.clientCode ?? t.clientName) === (target.clientCode ?? target.clientName)
            ? { ...t, completed: true }
            : t
        )));
        setRemovingClients((s) => { const n = new Set(s); n.delete(key); return n; });
      }, 280);
      addToast({ type: 'success', message: `${json.data.count} tarefa(s) concluída(s) para "${target.clientName}"` });
    } catch (e: unknown) {
      setConfirmBusy(false);
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao concluir cliente' });
    }
  }

  /* ─── Clear import ─── */
  async function executeClear() {
    setClearing(true);
    try {
      const res = await fetch('/api/gclick/tasks', { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setTasks([]);
      clearFiltersOnly();
      setClearOpen(false);
      addToast({ type: 'success', message: 'Importação removida' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao limpar importação' });
    } finally {
      setClearing(false);
    }
  }

  const isEmpty = !loading && tasks.length === 0;

  return (
    <div className="page-container">
      <PageHeader
        title="Tarefas G-Click"
        subtitle={!isEmpty ? `${indicatorsData.tasks} tarefa${indicatorsData.tasks !== 1 ? 's' : ''} em aberto` : undefined}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setClearOpen(true)} disabled={tasks.length === 0}>
              Limpar Importação
            </Button>
            <Button variant="primary" onClick={() => setImportOpen(true)}>⬆ Importar Planilha</Button>
          </div>
        }
      />

      {loading ? (
        <LoadingState message="Carregando tarefas..." />
      ) : isEmpty ? (
        <EmptyState
          icon={<span style={{ fontSize: 40 }}>📋</span>}
          title="Nenhuma planilha importada"
          description="Importe uma planilha do G-Click para visualizar suas tarefas."
          action={<Button variant="primary" onClick={() => setImportOpen(true)}>⬆ Importar Planilha</Button>}
        />
      ) : (
        <>
          <GClickIndicators data={indicatorsData} />

          {/* ── Busca e filtros ── */}
          <Card style={{ marginBottom: 18, padding: '14px 16px' } as React.CSSProperties}>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              <input
                className="form-input"
                style={{ flex: '2 1 220px', minWidth: 160 }}
                placeholder="Buscar cliente, código, assunto, competência..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <select className="form-select" style={{ flex: '1 1 150px', minWidth: 130 }} value={filterSubject} onChange={(e) => setFilterSubject(e.target.value)}>
                <option value="">Assunto</option>
                {subjects.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="form-select" style={{ flex: '1 1 140px', minWidth: 120 }} value={filterDepartment} onChange={(e) => setFilterDepartment(e.target.value)}>
                <option value="">Departamento</option>
                {departments.map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
              <select className="form-select" style={{ flex: '1 1 130px', minWidth: 110 }} value={filterCompetence} onChange={(e) => setFilterCompetence(e.target.value)}>
                <option value="">Competência</option>
                {competences.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
              <select className="form-select" style={{ flex: '1 1 130px', minWidth: 110 }} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Status</option>
                {statuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="form-select" style={{ flex: '1 1 140px', minWidth: 120 }} value={filterClientStatus} onChange={(e) => setFilterClientStatus(e.target.value)}>
                <option value="">Status Cliente</option>
                {clientStatuses.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="form-select" style={{ flex: '1 1 130px', minWidth: 120 }} value={filterDueBucket} onChange={(e) => setFilterDueBucket(e.target.value)}>
                <option value="">Vencimento</option>
                <option value="overdue">Vencido</option>
                <option value="today">Vence hoje</option>
                <option value="soon">Até 3 dias</option>
                <option value="ok">No prazo</option>
              </select>
              {hasFilters && (
                <Button variant="secondary" size="sm" onClick={clearFiltersOnly}>Limpar filtros</Button>
              )}
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                {subjectGroups.length} assunto{subjectGroups.length !== 1 ? 's' : ''}
              </span>
            </div>
          </Card>

          {/* ── Board ── */}
          {subjectGroups.length === 0 ? (
            <EmptyState
              title="Nenhuma tarefa encontrada"
              description={hasFilters ? 'Ajuste a busca ou os filtros para encontrar tarefas.' : 'Todas as tarefas foram concluídas 🎉'}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              {subjectGroups.map((group) => (
                <SubjectCard
                  key={group.subject}
                  group={group}
                  removing={removingSubjects.has(group.subject)}
                  removingClientKeys={removingClients}
                  onToggleTask={handleToggleTask}
                  onCompleteSubject={() => setConfirmSubject(group.subject)}
                  onCompleteClient={(clientCode, clientName) => setConfirmClient({ subject: group.subject, clientCode, clientName })}
                />
              ))}
            </div>
          )}
        </>
      )}

      <ImportGClickDrawer open={importOpen} onClose={() => setImportOpen(false)} onImported={load} />

      <ConfirmDialog
        open={confirmSubject !== null}
        onClose={() => setConfirmSubject(null)}
        onConfirm={executeCompleteSubject}
        title="Concluir assunto"
        message={`Deseja realmente concluir todas as tarefas do assunto "${confirmSubject}"?`}
        confirmLabel="Sim, concluir"
        variant="primary"
        loading={confirmBusy}
      />

      <ConfirmDialog
        open={confirmClient !== null}
        onClose={() => setConfirmClient(null)}
        onConfirm={executeCompleteClient}
        title="Concluir cliente"
        message={`Deseja realmente concluir todas as tarefas de "${confirmClient?.clientName}"?`}
        confirmLabel="Sim, concluir"
        variant="primary"
        loading={confirmBusy}
      />

      <ConfirmDialog
        open={clearOpen}
        onClose={() => setClearOpen(false)}
        onConfirm={executeClear}
        title="Limpar importação"
        message="Deseja remover toda a importação atual? Todas as tarefas importadas serão excluídas permanentemente."
        confirmLabel="Remover tudo"
        variant="danger"
        loading={clearing}
      />
    </div>
  );
}
