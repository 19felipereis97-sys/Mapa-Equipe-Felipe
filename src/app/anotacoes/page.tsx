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
import type { ClosingNote, Company } from '@/types/entities';

interface FormState {
  companyId: string;
  title: string;
  content: string;
  pinned: boolean;
}

const EMPTY_FORM: FormState = { companyId: '', title: '', content: '', pinned: false };

function formatDate(value: string) {
  return new Date(value).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function companyLabel(c: Company) {
  return c.code ? `${c.code} — ${c.corporateName}` : c.corporateName;
}

export default function AnotacoesPage() {
  const { addToast } = useToast();
  const [notes, setNotes] = useState<ClosingNote[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [showArchived, setShowArchived] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<ClosingNote | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<ClosingNote | null>(null);

  const loadCompanies = useCallback(async () => {
    const res = await fetch('/api/companies?includeTerminated=true');
    const json = await res.json();
    if (json.success) setCompanies(json.data ?? []);
  }, []);

  const loadNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (companyFilter) params.set('companyId', companyFilter);
      if (showArchived) params.set('showArchived', 'true');
      const res = await fetch(`/api/closing-notes?${params}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNotes(json.data ?? []);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao carregar anotações' });
    } finally {
      setLoading(false);
    }
  }, [addToast, companyFilter, search, showArchived]);

  useEffect(() => { loadCompanies(); }, [loadCompanies]);
  useEffect(() => { loadNotes(); }, [loadNotes]);

  function openNew() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setModalOpen(true);
  }

  function openEdit(note: ClosingNote) {
    setEditing(note);
    setForm({
      companyId: note.companyId ? String(note.companyId) : '',
      title: note.title,
      content: note.content,
      pinned: note.pinned,
    });
    setModalOpen(true);
  }

  async function handleSubmit() {
    if (!form.title.trim() || !form.content.trim()) {
      addToast({ type: 'warning', message: 'Título e anotação são obrigatórios.' });
      return;
    }
    setSaving(true);
    try {
      const payload = {
        companyId: form.companyId ? Number(form.companyId) : null,
        title: form.title,
        content: form.content,
        pinned: form.pinned,
      };
      const res = await fetch(editing ? `/api/closing-notes/${editing.id}` : '/api/closing-notes', {
        method: editing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast({ type: 'success', message: editing ? 'Anotação atualizada.' : 'Anotação criada.' });
      setModalOpen(false);
      await loadNotes();
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao salvar anotação' });
    } finally {
      setSaving(false);
    }
  }

  async function postAction(note: ClosingNote, action: 'pin' | 'archive' | 'unarchive') {
    const url = action === 'pin' ? `/api/closing-notes/${note.id}/pin` : `/api/closing-notes/${note.id}/archive`;
    const body = action === 'unarchive' ? { archived: false } : {};
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    setNotes((prev) => prev.map((n) => n.id === note.id ? json.data : n).filter((n) => showArchived || !n.archived));
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/closing-notes/${deleteTarget.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNotes((prev) => prev.filter((n) => n.id !== deleteTarget.id));
      addToast({ type: 'success', message: 'Anotação excluída.' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir anotação' });
    } finally {
      setSaving(false);
      setDeleteTarget(null);
    }
  }

  const emptyTitle = useMemo(() => {
    if (search || companyFilter) return 'Nenhuma anotação encontrada';
    if (showArchived) return 'Nenhuma anotação arquivada';
    return 'Nenhuma anotação de fechamento cadastrada';
  }, [companyFilter, search, showArchived]);

  return (
    <div className="page-container">
      <PageHeader
        title="Anotações de Fechamento"
        subtitle="Registre observações importantes para apoiar os fechamentos"
        actions={<Button variant="primary" onClick={openNew}>+ Nova Anotação</Button>}
      />

      <Card style={{ marginBottom: 16, padding: '14px 16px' }}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="form-input" style={{ flex: '2 1 220px' }} placeholder="Buscar por título, anotação ou empresa..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <select className="form-select" style={{ flex: '1 1 180px' }} value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}>
            <option value="">Todas as empresas</option>
            {companies.map((c) => <option key={c.id} value={String(c.id)}>{companyLabel(c)}</option>)}
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', cursor: 'pointer' }}>
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} style={{ accentColor: 'var(--color-primary)' }} />
            Mostrar arquivadas
          </label>
        </div>
      </Card>

      {loading ? (
        <LoadingState message="Carregando anotações..." />
      ) : notes.length === 0 ? (
        <Card><EmptyState title={emptyTitle} description={(search || companyFilter) ? 'Nenhuma anotação encontrada para os filtros aplicados.' : 'Crie uma anotação rápida para manter pontos importantes à mão.'} /></Card>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
          {notes.map((note) => (
            <Card key={note.id} style={{ opacity: note.archived ? 0.58 : 1, display: 'flex', flexDirection: 'column', gap: 10, minHeight: 190 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'flex-start' }}>
                <h2 style={{ fontSize: 'var(--font-size-md)', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>{note.title}</h2>
                {note.pinned && <span className="badge badge-warning" style={{ fontSize: 10 }}>Fixada</span>}
              </div>
              {note.company && <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--color-primary)' }}>{companyLabel(note.company)}</p>}
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55, whiteSpace: 'pre-wrap', display: '-webkit-box', WebkitLineClamp: 5, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{note.content}</p>
              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>Atualizada em {formatDate(note.updatedAt)}</span>
                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                  <button className="action-btn" onClick={() => postAction(note, 'pin')}>{note.pinned ? 'Desafixar' : 'Fixar'}</button>
                  <button className="action-btn" onClick={() => openEdit(note)}>Editar</button>
                  <button className="action-btn" onClick={() => postAction(note, note.archived ? 'unarchive' : 'archive')}>{note.archived ? 'Desarquivar' : 'Arquivar'}</button>
                  <button className="action-btn action-btn-danger" onClick={() => setDeleteTarget(note)}>Excluir</button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar anotação' : 'Nova anotação'}
        size="lg"
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
            <label className="form-label">Título *</label>
            <input className="form-input" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Anotação *</label>
            <textarea className="form-input" rows={7} value={form.content} onChange={(e) => setForm((p) => ({ ...p, content: e.target.value }))} />
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
            <input type="checkbox" checked={form.pinned} onChange={(e) => setForm((p) => ({ ...p, pinned: e.target.checked }))} style={{ accentColor: 'var(--color-primary)' }} />
            Fixar anotação
          </label>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteTarget !== null}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Excluir anotação"
        message={`Deseja excluir "${deleteTarget?.title}"? Essa ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        loading={saving}
      />
    </div>
  );
}
