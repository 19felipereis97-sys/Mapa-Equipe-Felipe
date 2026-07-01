'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import type { Deadline, Obligation } from '@/types/entities';

interface EditForm {
  startDay: string;
  dueDay: string;
  active: boolean;
}

export function TabPrazos() {
  const { addToast } = useToast();

  const [deadlines, setDeadlines] = useState<Deadline[]>([]);
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [formObligationId, setFormObligationId] = useState('');
  const [formStartDay, setFormStartDay] = useState('');
  const [formDueDay, setFormDueDay] = useState('');
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const [editModal, setEditModal] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({ startDay: '', dueDay: '', active: true });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});

  const [deleteId, setDeleteId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [dRes, oRes] = await Promise.all([
        fetch('/api/deadlines'),
        fetch('/api/obligations'),
      ]);
      const [dJson, oJson] = await Promise.all([dRes.json(), oRes.json()]);
      setDeadlines(dJson.data ?? []);
      setObligations(oJson.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar prazos' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const deadlineObligationIds = new Set(deadlines.map((d) => d.obligationId));
  const availableObligations = obligations.filter((o) => o.active && !deadlineObligationIds.has(o.id));

  function validateAddForm(): boolean {
    const errors: Record<string, string> = {};
    if (!formObligationId) errors.obligationId = 'Selecione uma obrigação';
    if (!formDueDay) errors.dueDay = 'Prazo final é obrigatório';
    const due = Number(formDueDay);
    if (formDueDay && (isNaN(due) || due < 1 || due > 31)) errors.dueDay = 'Deve ser entre 1 e 31';
    if (formStartDay) {
      const start = Number(formStartDay);
      if (isNaN(start) || start < 1 || start > 31) errors.startDay = 'Deve ser entre 1 e 31';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleAdd() {
    if (!validateAddForm()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/deadlines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          obligationId: Number(formObligationId),
          startDay: formStartDay ? Number(formStartDay) : null,
          dueDay: Number(formDueDay),
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setFormObligationId(''); setFormStartDay(''); setFormDueDay(''); setFormErrors({});
      await load();
      addToast({ type: 'success', message: 'Prazo adicionado com sucesso' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao adicionar prazo' });
    } finally { setSaving(false); }
  }

  function openEdit(d: Deadline) {
    setEditingId(d.id);
    setEditForm({
      startDay: d.startDay != null ? String(d.startDay) : '',
      dueDay: String(d.dueDay),
      active: d.active,
    });
    setEditErrors({});
    setEditModal(true);
  }

  function validateEditForm(): boolean {
    const errors: Record<string, string> = {};
    if (!editForm.dueDay) errors.dueDay = 'Prazo final é obrigatório';
    const due = Number(editForm.dueDay);
    if (editForm.dueDay && (isNaN(due) || due < 1 || due > 31)) errors.dueDay = 'Deve ser entre 1 e 31';
    if (editForm.startDay) {
      const start = Number(editForm.startDay);
      if (isNaN(start) || start < 1 || start > 31) errors.startDay = 'Deve ser entre 1 e 31';
    }
    setEditErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleEditSave() {
    if (!validateEditForm()) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/deadlines/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          startDay: editForm.startDay ? Number(editForm.startDay) : null,
          dueDay: Number(editForm.dueDay),
          active: editForm.active,
        }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setEditModal(false); setEditingId(null);
      await load();
      addToast({ type: 'success', message: 'Prazo atualizado' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar prazo' });
    } finally { setSaving(false); }
  }

  async function handleToggle(d: Deadline) {
    try {
      const res = await fetch(`/api/deadlines/${d.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !d.active }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await load();
      addToast({ type: 'success', message: d.active ? 'Prazo inativado' : 'Prazo ativado' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao alterar prazo' });
    }
  }

  async function handleDelete() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/deadlines/${deleteId}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDeleteId(null);
      await load();
      addToast({ type: 'success', message: 'Prazo excluído' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir prazo' });
    } finally { setSaving(false); }
  }

  const obligationOptions = availableObligations.map((o) => ({ value: String(o.id), label: o.name }));

  return (
    <>
      <Card>
        <p className="card-subtitle" style={{ marginBottom: 20, lineHeight: 1.6 }}>
          Configure o dia de início e o prazo final de cada obrigação. O Dashboard cruzará esses prazos com as pendências reais para gerar alertas automáticos.
        </p>

        {availableObligations.length > 0 ? (
          <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: 16, marginBottom: 24 }}>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 12, color: 'var(--text-primary)' }}>
              Adicionar prazo
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div style={{ flex: '1 1 200px', minWidth: 160 }}>
                <Select
                  label="Obrigação"
                  value={formObligationId}
                  onChange={(e) => setFormObligationId(e.target.value)}
                  options={obligationOptions}
                  placeholder="Selecionar..."
                  error={formErrors.obligationId}
                />
              </div>
              <div style={{ width: 120 }}>
                <Input
                  label="Início (dia)"
                  type="number"
                  min={1}
                  max={31}
                  value={formStartDay}
                  onChange={(e) => setFormStartDay(e.target.value)}
                  placeholder="Ex: 1"
                  error={formErrors.startDay}
                />
              </div>
              <div style={{ width: 120 }}>
                <Input
                  label="Prazo final (dia) *"
                  type="number"
                  min={1}
                  max={31}
                  value={formDueDay}
                  onChange={(e) => setFormDueDay(e.target.value)}
                  placeholder="Ex: 20"
                  error={formErrors.dueDay}
                />
              </div>
              <div style={{ paddingBottom: formErrors.dueDay ? 20 : 0 }}>
                <Button variant="primary" size="sm" onClick={handleAdd} loading={saving}>
                  Adicionar
                </Button>
              </div>
            </div>
          </div>
        ) : (
          deadlines.length > 0 && (
            <div style={{ background: 'var(--color-success-soft)', borderRadius: 'var(--radius-md)', padding: '10px 14px', marginBottom: 24 }}>
              <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>
                Todas as obrigações ativas já possuem prazo configurado.
              </span>
            </div>
          )
        )}

        {loading ? (
          <LoadingState message="Carregando prazos..." />
        ) : deadlines.length === 0 ? (
          <EmptyState title="Nenhum prazo configurado" description="Adicione prazos usando o formulário acima." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Obrigação</th>
                  <th style={{ width: 100 }}>Tipo</th>
                  <th style={{ width: 100 }}>Início</th>
                  <th style={{ width: 120 }}>Prazo final</th>
                  <th style={{ width: 80 }}>Status</th>
                  <th style={{ width: 160, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {deadlines.map((d) => (
                  <tr key={d.id} style={{ opacity: d.active ? 1 : 0.55 }}>
                    <td style={{ fontWeight: 500 }}>
                      {d.obligation?.name}
                      {d.obligation?.group && (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginLeft: 6 }}>
                          ({d.obligation.group})
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="badge badge-primary" style={{ fontSize: 'var(--font-size-xs)' }}>
                        {d.obligation?.type}
                      </span>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>
                      {d.startDay != null ? `Dia ${d.startDay}` : <span style={{ color: 'var(--text-placeholder)' }}>—</span>}
                    </td>
                    <td>
                      <span style={{
                        fontWeight: 700,
                        color: 'var(--color-primary)',
                        fontSize: 'var(--font-size-md)',
                      }}>
                        Dia {d.dueDay}
                      </span>
                    </td>
                    <td>
                      {d.active
                        ? <span className="badge badge-ok">Ativo</span>
                        : <span className="badge badge-sti">Inativo</span>}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="action-btn" onClick={() => openEdit(d)}>✎ Editar</button>
                        <button className="action-btn" onClick={() => handleToggle(d)}>
                          {d.active ? 'Inativar' : 'Ativar'}
                        </button>
                        {!d.obligation?.isDefault && (
                          <button
                            className="action-btn action-btn-danger"
                            onClick={() => setDeleteId(d.id)}
                          >
                            Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Modal
        open={editModal}
        onClose={() => { setEditModal(false); setEditingId(null); }}
        title="Editar Prazo"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditModal(false)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" onClick={handleEditSave} loading={saving}>Salvar</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Início (dia)"
            type="number"
            min={1}
            max={31}
            value={editForm.startDay}
            onChange={(e) => setEditForm({ ...editForm, startDay: e.target.value })}
            placeholder="Ex: 1"
            error={editErrors.startDay}
          />
          <Input
            label="Prazo final (dia) *"
            type="number"
            min={1}
            max={31}
            value={editForm.dueDay}
            onChange={(e) => setEditForm({ ...editForm, dueDay: e.target.value })}
            placeholder="Ex: 20"
            error={editErrors.dueDay}
          />
          <div className="form-group">
            <label className="form-label">Status</label>
            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={editForm.active}
                onChange={(e) => setEditForm({ ...editForm, active: e.target.checked })}
              />
              <span style={{ fontSize: 'var(--font-size-sm)' }}>Prazo ativo</span>
            </label>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteId !== null}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Excluir prazo"
        message="Tem certeza que deseja excluir este prazo?"
        confirmLabel="Excluir"
        loading={saving}
      />
    </>
  );
}
