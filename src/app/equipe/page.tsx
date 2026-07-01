'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useAppContext } from '@/context/AppContext';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

/* ─── Types ─── */
interface Leave {
  id: number;
  professionalId: number;
  startDate: string;
  endDate: string;
  description: string | null;
  professional?: { id: number; name: string };
}

interface MonthlyGoal {
  id: number;
  title: string;
  description: string | null;
  month: number;
  year: number;
  completed: boolean;
  completedAt: string | null;
}

/* ─── Section header ─── */
function SectionTitle({ title, sub }: { title: string; sub?: string }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)' }}>{title}</h2>
      {sub && <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>{sub}</p>}
    </div>
  );
}

/* ─── Leave form ─── */
function LeaveForm({
  professionals, initialData, onSave, onCancel,
}: {
  professionals: { id: number; name: string }[];
  initialData?: Partial<Leave>;
  onSave: (data: Omit<Leave, 'id' | 'professional'>) => Promise<void>;
  onCancel: () => void;
}) {
  const [professionalId, setProfessionalId] = useState(initialData?.professionalId ?? 0);
  const [startDate, setStartDate]           = useState(initialData?.startDate ?? '');
  const [endDate, setEndDate]               = useState(initialData?.endDate ?? '');
  const [description, setDescription]       = useState(initialData?.description ?? '');
  const [saving, setSaving]                 = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!professionalId || !startDate || !endDate) return;
    setSaving(true);
    try {
      await onSave({ professionalId, startDate, endDate, description: description || null });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: 16, background: 'var(--bg-hover)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)' }}>
      <div className="form-grid-2">
        <div className="form-group">
          <label className="form-label">Profissional *</label>
          <select className="form-select" value={professionalId} onChange={(e) => setProfessionalId(Number(e.target.value))} required>
            <option value={0}>Selecionar...</option>
            {professionals.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label className="form-label">Descrição</label>
          <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Motivo ou observação" />
        </div>
        <div className="form-group">
          <label className="form-label">Data início *</label>
          <input className="form-input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
        </div>
        <div className="form-group">
          <label className="form-label">Data fim *</label>
          <input className="form-input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} required />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} disabled={saving}>Cancelar</button>
        <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>{saving ? 'Salvando…' : 'Salvar folga'}</button>
      </div>
    </form>
  );
}

/* ─── Goal form ─── */
function GoalForm({
  initialData, onSave, onCancel,
}: {
  initialData?: Partial<MonthlyGoal>;
  onSave: (data: { title: string; description: string | null }) => Promise<void>;
  onCancel: () => void;
}) {
  const [title, setTitle]           = useState(initialData?.title ?? '');
  const [description, setDescription] = useState(initialData?.description ?? '');
  const [saving, setSaving]           = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setSaving(true);
    try {
      await onSave({ title: title.trim(), description: description || null });
    } finally { setSaving(false); }
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap', padding: '12px 0' }}>
      <div className="form-group" style={{ flex: '2 1 200px' }}>
        <input className="form-input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Nova meta..." required style={{ height: 34 }} />
      </div>
      <div className="form-group" style={{ flex: '1 1 150px' }}>
        <input className="form-input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descrição (opcional)" style={{ height: 34 }} />
      </div>
      <button type="submit" className="btn btn-primary btn-sm" disabled={saving || !title.trim()} style={{ height: 34 }}>
        {saving ? '…' : initialData?.id ? 'Salvar' : 'Adicionar'}
      </button>
      {onCancel && <button type="button" className="btn btn-secondary btn-sm" onClick={onCancel} style={{ height: 34 }}>Cancelar</button>}
    </form>
  );
}

/* ─── Page ─── */
export default function EquipePage() {
  const { addToast }       = useToast();
  const { professionals }  = useAppContext();
  const now                = new Date();

  const [leavesMonth, setLeavesMonth] = useState(now.getMonth() + 1);
  const [leavesYear, setLeavesYear]   = useState(now.getFullYear());
  const [leaves, setLeaves]           = useState<Leave[]>([]);
  const [leavesLoading, setLeavesLoading] = useState(false);
  const leavesLoadedRef = useRef(false);
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [editLeave, setEditLeave]     = useState<Leave | null>(null);
  const [deleteLeaveId, setDeleteLeaveId] = useState<number | null>(null);
  const [deletingLeave, setDeletingLeave] = useState(false);

  const [goalsMonth, setGoalsMonth] = useState(now.getMonth() + 1);
  const [goalsYear, setGoalsYear]   = useState(now.getFullYear());
  const [goals, setGoals]           = useState<MonthlyGoal[]>([]);
  const [goalsLoading, setGoalsLoading] = useState(false);
  const goalsLoadedRef = useRef(false);
  const [editGoal, setEditGoal]     = useState<MonthlyGoal | null>(null);
  const [deleteGoalId, setDeleteGoalId] = useState<number | null>(null);
  const [deletingGoal, setDeletingGoal] = useState(false);

  const activeProfessionals = professionals.filter((p) => p.active);
  const inactiveProfessionals = professionals.filter((p) => !p.active);

  /* ─── Load leaves ─── */
  const loadLeaves = useCallback(async (month: number, year: number) => {
    const showInitialLoading = !leavesLoadedRef.current;
    if (showInitialLoading) setLeavesLoading(true);
    try {
      const res = await fetch(`/api/leaves?month=${month}&year=${year}`);
      const json = await res.json();
      if (json.success) setLeaves(json.data ?? []);
    } catch { /* ignore */ } finally {
      leavesLoadedRef.current = true;
      if (showInitialLoading) setLeavesLoading(false);
    }
  }, []);

  useEffect(() => { loadLeaves(leavesMonth, leavesYear); }, [leavesMonth, leavesYear, loadLeaves]);

  /* ─── Load goals ─── */
  const loadGoals = useCallback(async (month: number, year: number) => {
    const showInitialLoading = !goalsLoadedRef.current;
    if (showInitialLoading) setGoalsLoading(true);
    try {
      const res = await fetch(`/api/monthly-goals?month=${month}&year=${year}`);
      const json = await res.json();
      if (json.success) setGoals(json.data ?? []);
    } catch { /* ignore */ } finally {
      goalsLoadedRef.current = true;
      if (showInitialLoading) setGoalsLoading(false);
    }
  }, []);

  useEffect(() => { loadGoals(goalsMonth, goalsYear); }, [goalsMonth, goalsYear, loadGoals]);

  /* ─── Leave CRUD ─── */
  async function saveLeave(data: Omit<Leave, 'id' | 'professional'>) {
    try {
      if (editLeave) {
        const res = await fetch(`/api/leaves/${editLeave.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        addToast({ type: 'success', message: 'Folga atualizada.' });
      } else {
        const res = await fetch('/api/leaves', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        addToast({ type: 'success', message: 'Folga registrada.' });
      }
      setShowLeaveForm(false);
      setEditLeave(null);
      loadLeaves(leavesMonth, leavesYear);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao salvar folga' });
    }
  }

  async function confirmDeleteLeave() {
    if (!deleteLeaveId) return;
    setDeletingLeave(true);
    try {
      await fetch(`/api/leaves/${deleteLeaveId}`, { method: 'DELETE' });
      addToast({ type: 'success', message: 'Folga removida.' });
      loadLeaves(leavesMonth, leavesYear);
    } catch { addToast({ type: 'error', message: 'Erro ao remover folga' }); }
    finally { setDeletingLeave(false); setDeleteLeaveId(null); }
  }

  /* ─── Goal CRUD ─── */
  async function saveGoal(data: { title: string; description: string | null }) {
    try {
      if (editGoal) {
        const res = await fetch(`/api/monthly-goals/${editGoal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        addToast({ type: 'success', message: 'Meta atualizada.' });
        setEditGoal(null);
      } else {
        const res = await fetch('/api/monthly-goals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...data, month: goalsMonth, year: goalsYear }) });
        const json = await res.json();
        if (!json.success) throw new Error(json.error);
        addToast({ type: 'success', message: 'Meta adicionada.' });
      }
      loadGoals(goalsMonth, goalsYear);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao salvar meta' });
    }
  }

  async function toggleGoal(goal: MonthlyGoal) {
    try {
      const res = await fetch(`/api/monthly-goals/${goal.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completed: !goal.completed }) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setGoals((prev) => prev.map((g) => g.id === goal.id ? { ...g, completed: !g.completed } : g));
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar meta' });
    }
  }

  async function confirmDeleteGoal() {
    if (!deleteGoalId) return;
    setDeletingGoal(true);
    try {
      await fetch(`/api/monthly-goals/${deleteGoalId}`, { method: 'DELETE' });
      addToast({ type: 'success', message: 'Meta removida.' });
      loadGoals(goalsMonth, goalsYear);
    } catch { addToast({ type: 'error', message: 'Erro ao remover meta' }); }
    finally { setDeletingGoal(false); setDeleteGoalId(null); }
  }

  const doneGoals  = goals.filter((g) => g.completed).length;
  const totalGoals = goals.length;

  /* ─── Render ─── */
  const tdBase: React.CSSProperties = { padding: '8px 12px', borderBottom: '1px solid var(--border-color)', fontSize: 12, color: 'var(--text-primary)', verticalAlign: 'middle' };
  const thBase: React.CSSProperties = { padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '2px solid var(--border-color)', background: 'var(--bg-table-header)', whiteSpace: 'nowrap' };

  return (
    <div className="page-container" style={{ paddingBottom: 40 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 className="page-title">Equipe</h1>
        <p className="page-subtitle">Profissionais, folgas e metas mensais</p>
      </div>

      {/* ── Membros ── */}
      <div style={{ marginBottom: 24 }}>
        <SectionTitle title="Membros ativos" sub={`${activeProfessionals.length} profissional${activeProfessionals.length !== 1 ? 'is' : ''} ativo${activeProfessionals.length !== 1 ? 's' : ''}`} />
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {activeProfessionals.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState title="Nenhum profissional ativo" description="Cadastre profissionais em Configurações → Profissionais." />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thBase}>Nome</th>
                  <th style={thBase}>Equipe</th>
                  <th style={thBase}>E-mail</th>
                  <th style={{ ...thBase, textAlign: 'center' }}>Status</th>
                </tr></thead>
                <tbody>
                  {activeProfessionals.map((p) => (
                    <tr key={p.id}>
                      <td style={{ ...tdBase, fontWeight: 500 }}>{p.name}</td>
                      <td style={{ ...tdBase, color: 'var(--text-secondary)' }}>{(p as { team?: { name: string } }).team?.name ?? '—'}</td>
                      <td style={{ ...tdBase, color: 'var(--text-secondary)' }}>{p.email ?? '—'}</td>
                      <td style={{ ...tdBase, textAlign: 'center' }}>
                        <span style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>Ativo</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {inactiveProfessionals.length > 0 && (
          <details style={{ marginTop: 10 }}>
            <summary style={{ cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary)', padding: '6px 0' }}>
              {inactiveProfessionals.length} profissional{inactiveProfessionals.length !== 1 ? 'is' : ''} inativo{inactiveProfessionals.length !== 1 ? 's' : ''}
            </summary>
            <Card style={{ padding: 0, overflow: 'hidden', marginTop: 8 }}>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <tbody>
                    {inactiveProfessionals.map((p) => (
                      <tr key={p.id}>
                        <td style={{ ...tdBase, fontWeight: 500, opacity: 0.6 }}>{p.name}</td>
                        <td style={{ ...tdBase, color: 'var(--text-secondary)', opacity: 0.6 }}>{(p as { team?: { name: string } }).team?.name ?? '—'}</td>
                        <td style={{ ...tdBase, textAlign: 'center' }}>
                          <span style={{ background: 'var(--bg-hover)', color: 'var(--text-placeholder)', fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>Inativo</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </details>
        )}
      </div>

      {/* ── Folgas ── */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <SectionTitle title="Folgas" sub="Períodos de ausência dos profissionais" />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="form-select" style={{ width: 130, height: 32, fontSize: 'var(--font-size-sm)' }} value={leavesMonth} onChange={(e) => setLeavesMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
            </select>
            <input className="form-input" type="number" style={{ width: 80, height: 32, fontSize: 'var(--font-size-sm)' }} value={leavesYear} onChange={(e) => setLeavesYear(Number(e.target.value))} min={2020} max={2100} />
            <button className="btn btn-primary btn-sm" onClick={() => { setShowLeaveForm(true); setEditLeave(null); }}>+ Registrar folga</button>
          </div>
        </div>

        {showLeaveForm && (
          <div style={{ marginBottom: 12 }}>
            <LeaveForm
              professionals={activeProfessionals}
              initialData={editLeave ?? undefined}
              onSave={saveLeave}
              onCancel={() => { setShowLeaveForm(false); setEditLeave(null); }}
            />
          </div>
        )}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {leavesLoading ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-placeholder)' }}>Carregando…</div>
          ) : leaves.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState title="Sem folgas neste mês" description={`Nenhuma folga registrada para ${MONTH_NAMES[leavesMonth - 1]} de ${leavesYear}.`} />
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>
                  <th style={thBase}>Profissional</th>
                  <th style={thBase}>Início</th>
                  <th style={thBase}>Fim</th>
                  <th style={thBase}>Descrição</th>
                  <th style={{ ...thBase, width: 80 }}></th>
                </tr></thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave.id}>
                      <td style={{ ...tdBase, fontWeight: 500 }}>{leave.professional?.name ?? '—'}</td>
                      <td style={tdBase}>{leave.startDate.split('-').reverse().join('/')}</td>
                      <td style={tdBase}>{leave.endDate.split('-').reverse().join('/')}</td>
                      <td style={{ ...tdBase, color: 'var(--text-secondary)' }}>{leave.description ?? '—'}</td>
                      <td style={{ ...tdBase, textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                          <button className="action-btn" onClick={() => { setEditLeave(leave); setShowLeaveForm(true); }}>Editar</button>
                          <button className="action-btn action-btn-danger" onClick={() => setDeleteLeaveId(leave.id)}>Excluir</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {/* ── Metas mensais ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
          <SectionTitle
            title="Metas do mês"
            sub={totalGoals > 0 ? `${doneGoals} de ${totalGoals} concluída${totalGoals !== 1 ? 's' : ''}` : 'Nenhuma meta cadastrada'}
          />
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select className="form-select" style={{ width: 130, height: 32, fontSize: 'var(--font-size-sm)' }} value={goalsMonth} onChange={(e) => setGoalsMonth(Number(e.target.value))}>
              {MONTH_NAMES.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
            </select>
            <input className="form-input" type="number" style={{ width: 80, height: 32, fontSize: 'var(--font-size-sm)' }} value={goalsYear} onChange={(e) => setGoalsYear(Number(e.target.value))} min={2020} max={2100} />
          </div>
        </div>

        {/* Add goal form (always visible) */}
        {!editGoal && (
          <GoalForm
            onSave={saveGoal}
            onCancel={() => {}}
          />
        )}

        <Card style={{ padding: 0, overflow: 'hidden' }}>
          {goalsLoading ? (
            <div style={{ padding: 24, textAlign: 'center', fontSize: 12, color: 'var(--text-placeholder)' }}>Carregando…</div>
          ) : goals.length === 0 ? (
            <div style={{ padding: 24 }}>
              <EmptyState title="Nenhuma meta para este mês" description="Adicione uma meta acima para começar." />
            </div>
          ) : (
            <div>
              {goals.map((goal) => (
                <div key={goal.id}>
                  {editGoal?.id === goal.id ? (
                    <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border-color)' }}>
                      <GoalForm
                        initialData={editGoal}
                        onSave={async (data) => { await saveGoal(data); setEditGoal(null); }}
                        onCancel={() => setEditGoal(null)}
                      />
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }}
                      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
                      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
                    >
                      <input
                        type="checkbox"
                        checked={goal.completed}
                        onChange={() => toggleGoal(goal)}
                        style={{ accentColor: 'var(--color-success)', cursor: 'pointer', flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 500, color: goal.completed ? 'var(--text-placeholder)' : 'var(--text-primary)', textDecoration: goal.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {goal.title}
                        </p>
                        {goal.description && (
                          <p style={{ fontSize: 11, color: 'var(--text-placeholder)', marginTop: 1 }}>{goal.description}</p>
                        )}
                      </div>
                      {goal.completed && (
                        <span style={{ fontSize: 10, background: 'var(--color-success-soft)', color: 'var(--color-success)', fontWeight: 700, padding: '1px 6px', borderRadius: 99, flexShrink: 0 }}>✓ Concluída</span>
                      )}
                      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                        <button className="action-btn" onClick={() => setEditGoal(goal)}>Editar</button>
                        <button className="action-btn action-btn-danger" onClick={() => setDeleteGoalId(goal.id)}>Excluir</button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={deleteLeaveId !== null}
        onClose={() => setDeleteLeaveId(null)}
        onConfirm={confirmDeleteLeave}
        title="Remover folga"
        message="Deseja remover esta folga? A ação não pode ser desfeita."
        confirmLabel="Remover"
        loading={deletingLeave}
      />
      <ConfirmDialog
        open={deleteGoalId !== null}
        onClose={() => setDeleteGoalId(null)}
        onConfirm={confirmDeleteGoal}
        title="Remover meta"
        message="Deseja remover esta meta? A ação não pode ser desfeita."
        confirmLabel="Remover"
        loading={deletingGoal}
      />
    </div>
  );
}
