'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

/* ─── Types ─── */
interface DailyGoal {
  id: number;
  title: string;
  description: string | null;
  date: string;
  completed: boolean;
  completedAt: string | null;
}

/* ─── Helpers ─── */
function todayStr() {
  return new Date().toISOString().split('T')[0];
}

function formatDateBR(iso: string) {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function dateLabel(iso: string) {
  const today     = todayStr();
  const [y, m, d] = iso.split('-').map(Number);
  const date      = new Date(y, m - 1, d);
  const weekdays  = ['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
  const months    = ['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
  const label     = `${weekdays[date.getDay()]}, ${d} de ${months[m - 1]} de ${y}`;
  if (iso === today) return `Hoje — ${label}`;
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === yesterday.toISOString().split('T')[0]) return `Ontem — ${label}`;
  return label;
}

/* ─── Goal row ─── */
function GoalRow({
  goal, isEditing, editTitle, editDesc,
  onToggle, onStartEdit, onSaveEdit, onCancelEdit, onEditTitle, onEditDesc, onDelete,
}: {
  goal: DailyGoal;
  isEditing: boolean;
  editTitle: string;
  editDesc: string;
  onToggle: () => void;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditTitle: (v: string) => void;
  onEditDesc: (v: string) => void;
  onDelete: () => void;
}) {
  if (isEditing) {
    return (
      <div style={{ padding: '8px 14px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-hover)' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input className="form-input" value={editTitle} onChange={(e) => onEditTitle(e.target.value)} style={{ flex: '2 1 180px', height: 30, fontSize: 12 }} />
          <input className="form-input" value={editDesc} onChange={(e) => onEditDesc(e.target.value)} placeholder="Descrição..." style={{ flex: '1 1 120px', height: 30, fontSize: 12 }} />
          <button className="btn btn-primary btn-sm" onClick={onSaveEdit} style={{ height: 30 }}>Salvar</button>
          <button className="action-btn" onClick={onCancelEdit} style={{ height: 30 }}>Cancelar</button>
        </div>
      </div>
    );
  }
  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderBottom: '1px solid var(--border-color)', transition: 'background var(--transition-fast)' }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
    >
      <input type="checkbox" checked={goal.completed} onChange={onToggle} style={{ accentColor: 'var(--color-success)', cursor: 'pointer', flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 500, color: goal.completed ? 'var(--text-placeholder)' : 'var(--text-primary)', textDecoration: goal.completed ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {goal.title}
        </p>
        {goal.description && (
          <p style={{ fontSize: 11, color: 'var(--text-placeholder)', marginTop: 1 }}>{goal.description}</p>
        )}
      </div>
      <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
        {!goal.completed && <button className="action-btn" onClick={onStartEdit}>Editar</button>}
        <button className="action-btn action-btn-danger" onClick={onDelete}>Excluir</button>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function MetasDiaPage() {
  const { addToast } = useToast();
  const [date, setDate]           = useState(todayStr());
  const [goals, setGoals]         = useState<DailyGoal[]>([]);
  const [loading, setLoading]     = useState(false);
  const hasLoadedRef = useRef(false);
  const [newTitle, setNewTitle]   = useState('');
  const [newDesc, setNewDesc]     = useState('');
  const [adding, setAdding]       = useState(false);
  const [editGoal, setEditGoal]   = useState<DailyGoal | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc]   = useState('');
  const [deleteId, setDeleteId]   = useState<number | null>(null);
  const [deleting, setDeleting]   = useState(false);

  /* ─── Load ─── */
  const load = useCallback(async (d: string) => {
    const showInitialLoading = !hasLoadedRef.current;
    if (showInitialLoading) setLoading(true);
    try {
      const res = await fetch(`/api/daily-goals?date=${d}`);
      const json = await res.json();
      if (json.success) setGoals(json.data ?? []);
    } catch { /* ignore */ } finally {
      hasLoadedRef.current = true;
      if (showInitialLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { load(date); }, [date, load]);

  /* ─── Add ─── */
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim()) return;
    setAdding(true);
    try {
      const res = await fetch('/api/daily-goals', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim(), description: newDesc || null, date }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNewTitle(''); setNewDesc('');
      addToast({ type: 'success', message: 'Meta adicionada.' });
      load(date);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao adicionar meta' });
    } finally { setAdding(false); }
  }

  /* ─── Toggle ─── */
  async function toggleGoal(goal: DailyGoal) {
    try {
      const res = await fetch(`/api/daily-goals/${goal.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !goal.completed }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setGoals((prev) => prev.map((g) =>
        g.id === goal.id ? { ...g, completed: !g.completed, completedAt: !goal.completed ? new Date().toISOString() : null } : g
      ));
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar meta' });
    }
  }

  /* ─── Edit ─── */
  function startEdit(goal: DailyGoal) { setEditGoal(goal); setEditTitle(goal.title); setEditDesc(goal.description ?? ''); }

  async function saveEdit() {
    if (!editGoal || !editTitle.trim()) return;
    try {
      const res = await fetch(`/api/daily-goals/${editGoal.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: editTitle.trim(), description: editDesc || null }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast({ type: 'success', message: 'Meta atualizada.' });
      setEditGoal(null);
      load(date);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar meta' });
    }
  }

  /* ─── Delete ─── */
  async function confirmDelete() {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await fetch(`/api/daily-goals/${deleteId}`, { method: 'DELETE' });
      addToast({ type: 'success', message: 'Meta removida.' });
      load(date);
    } catch { addToast({ type: 'error', message: 'Erro ao remover meta' }); }
    finally { setDeleting(false); setDeleteId(null); }
  }

  /* ─── Navigation ─── */
  function shiftDate(delta: number) {
    const d = new Date(date + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setDate(d.toISOString().split('T')[0]);
  }

  const doneCount  = goals.filter((g) => g.completed).length;
  const totalCount = goals.length;
  const isToday    = date === todayStr();

  /* ─── Render ─── */
  return (
    <div className="page-container" style={{ paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Metas do Dia</h1>
          <p className="page-subtitle">Acompanhamento diário de tarefas</p>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="action-btn" onClick={() => shiftDate(-1)} title="Dia anterior">‹</button>
          <input className="form-input" type="date" value={date} onChange={(e) => setDate(e.target.value)} style={{ width: 150, height: 34, fontSize: 'var(--font-size-sm)' }} />
          <button className="action-btn" onClick={() => shiftDate(1)} title="Próximo dia">›</button>
          {!isToday && (
            <button className="action-btn" onClick={() => setDate(todayStr())} style={{ color: 'var(--color-primary)', borderColor: 'var(--color-primary)' }}>Hoje</button>
          )}
        </div>
      </div>

      {/* ── Date title + progress ── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 600, color: 'var(--text-primary)' }}>
            {dateLabel(date)}
          </h2>
          {totalCount > 0 && (
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 2 }}>
              {doneCount} de {totalCount} meta{totalCount !== 1 ? 's' : ''} concluída{totalCount !== 1 ? 's' : ''}
            </p>
          )}
        </div>
        {totalCount > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 120, height: 8, background: 'var(--border-color)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: `${Math.round((doneCount / totalCount) * 100)}%`, background: doneCount === totalCount ? 'var(--color-success)' : 'var(--color-primary)', borderRadius: 4, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: doneCount === totalCount ? 'var(--color-success)' : 'var(--color-primary)' }}>
              {Math.round((doneCount / totalCount) * 100)}%
            </span>
            {doneCount === totalCount && totalCount > 0 && (
              <span style={{ fontSize: 12, color: 'var(--color-success)', fontWeight: 600 }}>🎉 Todas concluídas!</span>
            )}
          </div>
        )}
      </div>

      {/* ── Add goal form ── */}
      <Card style={{ marginBottom: 16 }}>
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ flex: '2 1 200px' }}>
            <label className="form-label" style={{ fontSize: 11 }}>Nova meta para {formatDateBR(date)}</label>
            <input className="form-input" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="O que você quer fazer?" style={{ height: 34 }} />
          </div>
          <div className="form-group" style={{ flex: '1 1 150px' }}>
            <label className="form-label" style={{ fontSize: 11 }}>Descrição (opcional)</label>
            <input className="form-input" value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Detalhes..." style={{ height: 34 }} />
          </div>
          <button type="submit" className="btn btn-primary btn-sm" disabled={adding || !newTitle.trim()} style={{ height: 34, flexShrink: 0 }}>
            {adding ? '…' : '+ Adicionar'}
          </button>
        </form>
      </Card>

      {/* ── Goals list ── */}
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: 'center', fontSize: 12, color: 'var(--text-placeholder)' }}>Carregando…</div>
        ) : goals.length === 0 ? (
          <div style={{ padding: 32 }}>
            <EmptyState
              title={isToday ? 'Nenhuma meta para hoje' : `Nenhuma meta para ${formatDateBR(date)}`}
              description="Adicione uma meta acima para começar."
            />
          </div>
        ) : (
          <div>
            {/* Pendentes */}
            {goals.filter((g) => !g.completed).length > 0 && (
              <>
                <div style={{ padding: '8px 14px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Pendentes ({goals.filter((g) => !g.completed).length})
                  </span>
                </div>
                {goals.filter((g) => !g.completed).map((goal) => (
                  <GoalRow
                    key={goal.id} goal={goal}
                    isEditing={editGoal?.id === goal.id} editTitle={editTitle} editDesc={editDesc}
                    onToggle={() => toggleGoal(goal)} onStartEdit={() => startEdit(goal)}
                    onSaveEdit={saveEdit} onCancelEdit={() => setEditGoal(null)}
                    onEditTitle={setEditTitle} onEditDesc={setEditDesc} onDelete={() => setDeleteId(goal.id)}
                  />
                ))}
              </>
            )}
            {/* Concluídas */}
            {goals.filter((g) => g.completed).length > 0 && (
              <>
                <div style={{ padding: '8px 14px', background: 'var(--bg-hover)', borderBottom: '1px solid var(--border-color)', borderTop: goals.some((g) => !g.completed) ? '1px solid var(--border-color)' : 'none' }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--color-success)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Concluídas ({goals.filter((g) => g.completed).length})
                  </span>
                </div>
                {goals.filter((g) => g.completed).map((goal) => (
                  <GoalRow
                    key={goal.id} goal={goal}
                    isEditing={editGoal?.id === goal.id} editTitle={editTitle} editDesc={editDesc}
                    onToggle={() => toggleGoal(goal)} onStartEdit={() => startEdit(goal)}
                    onSaveEdit={saveEdit} onCancelEdit={() => setEditGoal(null)}
                    onEditTitle={setEditTitle} onEditDesc={setEditDesc} onDelete={() => setDeleteId(goal.id)}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </Card>

      {/* ── Confirm delete ── */}
      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={confirmDelete}
        title="Remover meta"
        message="Deseja remover esta meta? A ação não pode ser desfeita."
        confirmLabel="Remover"
        loading={deleting}
      />
    </div>
  );
}
