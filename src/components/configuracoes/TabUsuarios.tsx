'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { EmptyState } from '@/components/ui/EmptyState';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import type { Role } from '@/lib/permissions';

interface UserRow {
  id: number; name: string; email: string; role: Role; active: boolean;
}

const ROLE_LABELS: Record<Role, string> = {
  ADMIN: 'Administrador', GESTOR: 'Gestor', OPERADOR: 'Operador', LEITURA: 'Leitura',
};
const ROLE_OPTIONS = Object.keys(ROLE_LABELS) as Role[];

export function TabUsuarios() {
  const { addToast } = useToast();
  const [items, setItems] = useState<UserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'LEITURA' as Role });

  const [pwUser, setPwUser] = useState<UserRow | null>(null);
  const [newPw, setNewPw] = useState('');

  const [deleteUser, setDeleteUser] = useState<UserRow | null>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setItems(json.data ?? []);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao carregar usuários' });
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function patch(id: number, data: Record<string, unknown>, okMsg: string) {
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await load();
      addToast({ type: 'success', message: okMsg });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar' });
      await load();
    } finally { setSaving(false); }
  }

  async function handleCreate() {
    setSaving(true);
    try {
      const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCreateOpen(false);
      setForm({ name: '', email: '', password: '', role: 'LEITURA' });
      await load();
      addToast({ type: 'success', message: 'Usuário criado' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao criar usuário' });
    } finally { setSaving(false); }
  }

  async function handleResetPassword() {
    if (!pwUser) return;
    if (newPw.length < 8) { addToast({ type: 'warning', message: 'Senha deve ter ao menos 8 caracteres' }); return; }
    await patch(pwUser.id, { password: newPw }, `Senha de ${pwUser.name} redefinida`);
    setPwUser(null); setNewPw('');
  }

  async function handleDelete() {
    if (!deleteUser) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/users/${deleteUser.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setDeleteUser(null);
      await load();
      addToast({ type: 'success', message: 'Usuário excluído' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir' });
    } finally { setSaving(false); }
  }

  return (
    <>
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span className="card-title">Usuários e acesso</span>
            <span className="badge badge-neutral">{items.length}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setCreateOpen(true)}>+ Novo usuário</Button>
        </div>

        {loading ? (
          <LoadingState message="Carregando usuários..." />
        ) : items.length === 0 ? (
          <EmptyState title="Nenhum usuário" description="Crie o primeiro usuário de acesso." />
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>E-mail</th>
                  <th style={{ width: 150 }}>Papel</th>
                  <th style={{ width: 90 }}>Status</th>
                  <th style={{ width: 220, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {items.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{u.email}</td>
                    <td>
                      <select
                        className="form-select"
                        style={{ height: 30, fontSize: 'var(--font-size-sm)' }}
                        value={u.role}
                        disabled={saving}
                        onChange={(e) => patch(u.id, { role: e.target.value }, 'Papel atualizado')}
                      >
                        {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                    </td>
                    <td>
                      <button
                        className={`badge ${u.active ? 'badge-success' : 'badge-neutral'}`}
                        style={{ cursor: 'pointer', border: 'none' }}
                        disabled={saving}
                        onClick={() => patch(u.id, { active: !u.active }, u.active ? 'Usuário desativado' : 'Usuário ativado')}
                        title="Clique para alternar"
                      >
                        {u.active ? 'Ativo' : 'Inativo'}
                      </button>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: 4, justifyContent: 'flex-end' }}>
                        <button className="action-btn" onClick={() => { setPwUser(u); setNewPw(''); }}>Redefinir senha</button>
                        <button className="action-btn action-btn-danger" onClick={() => setDeleteUser(u)}>Excluir</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Criar usuário */}
      <Modal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Novo usuário"
        footer={
          <>
            <Button variant="secondary" onClick={() => setCreateOpen(false)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>Criar</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Nome
            <input className="form-input" style={{ marginTop: 4 }} value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>E-mail
            <input className="form-input" type="email" style={{ marginTop: 4 }} value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Senha (mín. 8 caracteres)
            <input className="form-input" type="password" style={{ marginTop: 4 }} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Papel
            <select className="form-select" style={{ marginTop: 4 }} value={form.role} onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as Role }))}>
              {ROLE_OPTIONS.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </select>
          </label>
        </div>
      </Modal>

      {/* Redefinir senha */}
      <Modal
        open={pwUser !== null}
        onClose={() => setPwUser(null)}
        title={`Redefinir senha — ${pwUser?.name ?? ''}`}
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPwUser(null)} disabled={saving}>Cancelar</Button>
            <Button variant="primary" onClick={handleResetPassword} disabled={saving}>Salvar</Button>
          </>
        }
      >
        <label style={{ fontSize: 13, fontWeight: 600 }}>Nova senha (mín. 8 caracteres)
          <input className="form-input" type="password" style={{ marginTop: 4 }} value={newPw} onChange={(e) => setNewPw(e.target.value)} autoFocus />
        </label>
      </Modal>

      <ConfirmDialog
        open={deleteUser !== null}
        onClose={() => setDeleteUser(null)}
        onConfirm={handleDelete}
        title="Excluir usuário"
        message={`Excluir o usuário "${deleteUser?.name}"? Ele perderá o acesso ao sistema.`}
        confirmLabel="Excluir"
        variant="danger"
        loading={saving}
      />
    </>
  );
}
