'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import type { Company, Reminder } from '@/types/entities';

type ViewMode = 'open' | 'completed' | 'all';

interface FormState {
  companyId: string;
  text: string;
  remindAt: string;
}

const EMPTY_FORM: FormState = { companyId: '', text: '', remindAt: '' };

function dateOnly(value: string | null) {
  if (!value) return '';
  return new Date(value).toISOString().slice(0, 10);
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function companyLabel(c: Company) {
  return c.code ? `${c.code} — ${c.corporateName}` : c.corporateName;
}

function reminderTone(remindAt: string | null, completed: boolean) {
  if (!remindAt || completed) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const date = new Date(remindAt);
  date.setHours(0, 0, 0, 0);
  if (date.getTime() < today.getTime()) return { label: 'Vencido', className: 'badge-danger' };
  if (date.getTime() === today.getTime()) return { label: 'Hoje', className: 'badge-warning' };
  return null;
}

export default function LembretesPage() {
  const { addToast } = useToast();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [view, setView] = useState<ViewMode>('open');
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Reminder | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Reminder | null>(null);

  const loadCompanies = useCallback(async () => {
    const res = await fetch('/api/companies?includeTerminated=true');
    const json = await res.json();
    if (json.success) setCompanies(json.data ?? []);
  }, []);

  const loadReminders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ view });
      if (search.trim()) params.set('search', search.trim());
      if (companyFilter) params.set('companyId', companyFilter);
      const res = await fetch(`/api/reminders?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setReminders(json.data ?? []);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao carregar lembretes' });
    } finally {
      setLoading(false);
    }
  }, [addToast, companyFilter, search, view]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useEffect(() => { loadReminders(); }, [loadReminders]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(reminder: Reminder) {
    setEditing(reminder);
    setForm({
      companyId: reminder.companyId ? String(reminder.companyId) : '',
      text: reminder.text,
      remindAt: dateOnly(reminder.remindAt),
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.text.trim()) {
      addToast({ type: 'warning', message: 'Lembrete é obrigatório.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        companyId: form.companyId ? Number(form.companyId) : null,
        text: form.text,
        remindAt: form.remindAt || null,
      };
      const res = await fetch(editing ? `/api/reminders/${editing.id}` : '/api/reminders', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast({ type: 'success', message: editing ? 'Lembrete atualizado.' : 'Lembrete criado.' });
      setModalOpen(false);
      await loadReminders();
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao salvar lembrete' });
    } finally {
      setSaving(false);
    }
  }

  async function toggleComplete(reminder: Reminder) {
    const res = await fetch(`/api/reminders/${reminder.id}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !reminder.completed }),
    });
    const json = await res.json();
    if (!json.success) {
      addToast({ type: 'error', message: json.error ?? 'Erro ao atualizar lembrete' });
      return;
    }
    addToast({ type: 'success', message: reminder.completed ? 'Lembrete reaberto.' : 'Lembrete concluído.' });
    setReminders((prev) => prev.map((r) => r.id === reminder.id ? json.data : r).filter((r) => view === 'all' || (view === 'open' ? !r.completed : r.completed)));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/reminders/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setReminders((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      addToast({ type: 'success', message: 'Lembrete excluído.' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir lembrete' });
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  }

  const emptyTitle = useMemo(() => {
    if (search || companyFilter) return 'Nenhum lembrete encontrado';
    if (view === 'completed') return 'Nenhum lembrete concluído';
    if (view === 'open') return 'Nenhum lembrete aberto';
    return 'Nenhum lembrete cadastrado';
  }, [companyFilter, search, view]);

  return (
    <div className="page-container">
      <PageHeader
        title="Lembretes"
        subtitle="Registre pontos rápidos para retomar depois"
        actions={<Button variant="primary" onClick={openNew}>+ Novo Lembrete</Button>}
      />

      <Card style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ display: 'flex', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', overflow: 'hidden' }}>
            {[
              { id: 'open', label: 'Abertos' },
              { id: 'completed', label: 'Concluídos' },
              { id: 'all', label: 'Todos' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => setView(item.id as ViewMode)}
                style={{ padding: '7px 12px', border: 'none', background: view === item.id ? 'var(--color-primary)' : 'var(--bg-card)', color: view === item.id ? '#fff' : 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
              >
                {item.label}
              </button>
            ))}
          </div>
          <input className="form-input" style={{ flex: '2 1 220px' }} placeholder="Buscar lembrete ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-select" style={{ flex: '1 1 180px' }} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">Todas as empresas</option>
            {companies.map((c) => <option key={c.id} value={String(c.id)}>{companyLabel(c)}</option>)}
          </select>
        </div>
      </Card>

      {loading ? (
        <LoadingState message="Carregando lembretes..." />
      ) : reminders.length === 0 ? (
        <Card><EmptyState title={emptyTitle} description={(search || companyFilter) ? 'Nenhum lembrete encontrado para os filtros aplicados.' : 'Crie um lembrete rápido para voltar a um ponto depois.'} /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {reminders.map((reminder) => {
            const tone = reminderTone(reminder.remindAt, reminder.completed);
            return (
              <Card key={reminder.id} style={{ opacity: reminder.completed ? 0.58 : 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 170 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8 }}>
                  <label style={{ display: 'flex', gap: 8, alignItems: 'flex-start', cursor: 'pointer', flex: 1 }}>
                    <input type="checkbox" checked={reminder.completed} onChange={() => toggleComplete(reminder)} style={{ marginTop: 3, accentColor: 'var(--color-success)' }} />
                    <span style={{ fontSize: 14, color: reminder.completed ? 'var(--text-placeholder)' : 'var(--text-primary)', fontWeight: 500, lineHeight: 1.5, textDecoration: reminder.completed ? 'line-through' : 'none' }}>{reminder.text}</span>
                  </label>
                  {reminder.completed && <span className="badge badge-ok" style={{ fontSize: 10 }}>Concluído</span>}
                </div>
                {reminder.company && <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{companyLabel(reminder.company)}</p>}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {reminder.remindAt && <span className={`badge ${tone?.className ?? 'badge-stc'}`} style={{ fontSize: 10 }}>Lembrar: {formatDate(reminder.remindAt)}</span>}
                  {tone && <span className={`badge ${tone.className}`} style={{ fontSize: 10 }}>{tone.label}</span>}
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>Atualizado em {formatDate(reminder.updatedAt)}</span>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    <button className="action-btn" onClick={() => toggleComplete(reminder)}>{reminder.completed ? 'Reabrir' : 'Concluir'}</button>
                    <button className="action-btn" onClick={() => openEdit(reminder)}>Editar</button>
                    <button className="action-btn action-btn-danger" onClick={() => setDeleteTarget(reminder)}>Excluir</button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar lembrete' : 'Novo lembrete'}
        footer={<><Button variant="secondary" onClick={() => setModalOpen(false)} disabled={saving}>Cancelar</Button><Button variant="primary" onClick={handleSubmit} loading={saving}>Salvar</Button></>}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Empresa opcional</label>
            <select className="form-select" value={form.companyId} onChange={(e) => setForm((p) => ({ ...p, companyId: e.target.value }))}>
              <option value="">Sem empresa vinculada</option>
              {companies.map((c) => <option key={c.id} value={String(c.id)}>{companyLabel(c)}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Lembrete *</label>
            <textarea className="form-input" rows={5} value={form.text} onChange={(e) => setForm((p) => ({ ...p, text: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Data para lembrar</label>
            <input className="form-input" type="date" value={form.remindAt} onChange={(e) => setForm((p) => ({ ...p, remindAt: e.target.value }))} />
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Excluir lembrete"
        message="Deseja excluir este lembrete? Essa ação não pode ser desfeita."
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
