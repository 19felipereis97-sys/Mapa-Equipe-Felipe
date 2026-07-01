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
import type { Professional, Team } from '@/types/entities';
import { useAppContext } from '@/context/AppContext';

interface FormState {
  name: string;
  teamId: string;
  email: string;
}

const EMPTY_FORM: FormState = { name: '', teamId: '', email: '' };

function validateEmail(email: string) {
  if (!email) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function TabProfissionais() {
  const { addToast } = useToast();
  const { refreshAppData } = useAppContext();

  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({});

  const [deactivateId, setDeactivateId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [pRes, tRes] = await Promise.all([
        fetch('/api/professionals'),
        fetch('/api/teams'),
      ]);
      const [pJson, tJson] = await Promise.all([pRes.json(), tRes.json()]);
      setProfessionals(pJson.data ?? []);
      setTeams(tJson.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar dados' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function openAdd() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalOpen(true);
  }

  function openEdit(p: Professional) {
    setEditingId(p.id);
    setForm({ name: p.name, teamId: p.teamId ? String(p.teamId) : '', email: p.email ?? '' });
    setFormErrors({});
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormErrors({});
  }

  function validate(): boolean {
    const errors: Partial<FormState> = {};
    if (!form.name.trim()) errors.name = 'Nome é obrigatório';
    if (form.email && !validateEmail(form.email)) errors.email = 'E-mail inválido';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSave() {
    if (!validate()) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        teamId: form.teamId ? Number(form.teamId) : null,
        email: form.email || null,
      };
      const res = editingId
        ? await fetch(`/api/professionals/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/professionals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      closeModal();
      await load();
      refreshAppData();
      addToast({ type: 'success', message: editingId ? 'Profissional atualizado' : 'Profissional criado com sucesso' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao salvar profissional' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (!deactivateId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/professionals/${deactivateId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: false }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDeactivateId(null);
      await load();
      refreshAppData();
      addToast({ type: 'success', message: 'Profissional desativado' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao desativar' });
    } finally {
      setSaving(false);
    }
  }

  async function handleReactivate(id: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/professionals/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await load();
      refreshAppData();
      addToast({ type: 'success', message: 'Profissional reativado' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao reativar' });
    } finally {
      setSaving(false);
    }
  }

  const filtered = professionals.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase())
  );
  const active = filtered.filter((p) => p.active);
  const inactive = filtered.filter((p) => !p.active);

  const teamOptions = teams.filter((t) => t.active).map((t) => ({ value: String(t.id), label: t.name }));

  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">Profissionais</span>
            <span className="badge badge-neutral">{professionals.filter((p) => p.active).length} ativos</span>
          </div>
          <Button variant="primary" size="sm" onClick={openAdd}>+ Novo Profissional</Button>
        </div>

        <div style={{ marginBottom: 16 }}>
          <input
            className="form-input"
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ maxWidth: 320 }}
          />
        </div>

        {loading ? (
          <LoadingState message="Carregando profissionais..." />
        ) : (
          <>
            {active.length === 0 && inactive.length === 0 ? (
              <EmptyState
                title="Nenhum profissional"
                description="Clique em + Novo Profissional para adicionar o primeiro."
              />
            ) : (
              <>
                {active.length > 0 && (
                  <div className="table-wrapper" style={{ marginBottom: inactive.length > 0 ? 24 : 0 }}>
                    <table>
                      <thead>
                        <tr>
                          <th>Nome</th>
                          <th>Equipe</th>
                          <th>E-mail</th>
                          <th style={{ width: 80 }}>Status</th>
                          <th style={{ width: 160, textAlign: 'right' }}>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        {active.map((p) => (
                          <tr key={p.id}>
                            <td style={{ fontWeight: 500 }}>{p.name}</td>
                            <td>{p.team?.name ?? <span style={{ color: 'var(--text-placeholder)' }}>—</span>}</td>
                            <td>{p.email ?? <span style={{ color: 'var(--text-placeholder)' }}>—</span>}</td>
                            <td>
                              <span className="badge badge-ok">Ativo</span>
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                                <button className="action-btn" onClick={() => openEdit(p)}>✎ Editar</button>
                                <button className="action-btn action-btn-danger" onClick={() => setDeactivateId(p.id)}>Desativar</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {inactive.length > 0 && (
                  <>
                    <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8, marginTop: active.length > 0 ? 8 : 0 }}>
                      Inativos ({inactive.length})
                    </p>
                    <div className="table-wrapper">
                      <table style={{ opacity: 0.65 }}>
                        <thead>
                          <tr>
                            <th>Nome</th>
                            <th>Equipe</th>
                            <th>E-mail</th>
                            <th style={{ width: 80 }}>Status</th>
                            <th style={{ width: 120, textAlign: 'right' }}>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inactive.map((p) => (
                            <tr key={p.id}>
                              <td style={{ fontWeight: 500 }}>{p.name}</td>
                              <td>{p.team?.name ?? <span style={{ color: 'var(--text-placeholder)' }}>—</span>}</td>
                              <td>{p.email ?? <span style={{ color: 'var(--text-placeholder)' }}>—</span>}</td>
                              <td>
                                <span className="badge badge-sti">Inativo</span>
                              </td>
                              <td style={{ textAlign: 'right' }}>
                                <button className="action-btn" onClick={() => handleReactivate(p.id)} disabled={saving}>
                                  Reativar
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </>
            )}
          </>
        )}
      </Card>

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={editingId ? 'Editar Profissional' : 'Novo Profissional'}
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={closeModal} disabled={saving}>Cancelar</Button>
            <Button variant="primary" onClick={handleSave} loading={saving}>Salvar</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Input
            label="Nome *"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            error={formErrors.name}
            placeholder="Nome completo"
            autoFocus
          />
          <Select
            label="Equipe"
            value={form.teamId}
            onChange={(e) => setForm({ ...form, teamId: e.target.value })}
            options={teamOptions}
            placeholder="Selecionar equipe..."
          />
          <Input
            label="E-mail"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            error={formErrors.email}
            placeholder="email@exemplo.com"
          />
        </div>
      </Modal>

      <ConfirmDialog
        open={deactivateId !== null}
        onClose={() => setDeactivateId(null)}
        onConfirm={handleDeactivate}
        title="Desativar profissional"
        message="Este profissional ficará inativo e não aparecerá nas opções de seleção. Deseja continuar?"
        confirmLabel="Desativar"
        loading={saving}
      />
    </>
  );
}
