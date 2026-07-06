'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';

const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador', GESTOR: 'Gestor', OPERADOR: 'Operador', LEITURA: 'Leitura',
};

export default function ContaPage() {
  const { data: session } = useSession();
  const { addToast } = useToast();

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (next.length < 8) { addToast({ type: 'warning', message: 'A nova senha deve ter ao menos 8 caracteres' }); return; }
    if (next !== confirm) { addToast({ type: 'warning', message: 'A confirmação não confere' }); return; }
    setSaving(true);
    try {
      const res = await fetch('/api/account/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setCurrent(''); setNext(''); setConfirm('');
      addToast({ type: 'success', message: 'Senha alterada com sucesso' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao trocar senha' });
    } finally { setSaving(false); }
  }

  const user = session?.user;
  const role = (user as { role?: string } | undefined)?.role;

  return (
    <div className="page-container">
      <PageHeader title="Minha conta" subtitle="Dados de acesso e senha" />

      <Card style={{ marginBottom: 18 }}>
        <span className="card-title">Dados</span>
        <div style={{ marginTop: 12, display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: 'var(--font-size-sm)' }}>
          <span style={{ color: 'var(--text-secondary)' }}>Nome</span><span>{user?.name ?? '—'}</span>
          <span style={{ color: 'var(--text-secondary)' }}>E-mail</span><span>{user?.email ?? '—'}</span>
          <span style={{ color: 'var(--text-secondary)' }}>Papel</span><span>{role ? (ROLE_LABELS[role] ?? role) : '—'}</span>
        </div>
      </Card>

      <Card>
        <span className="card-title">Alterar senha</span>
        <form onSubmit={handleSubmit} style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 380 }}>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Senha atual
            <input className="form-input" type="password" style={{ marginTop: 4 }} value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Nova senha (mín. 8 caracteres)
            <input className="form-input" type="password" style={{ marginTop: 4 }} value={next} onChange={(e) => setNext(e.target.value)} required />
          </label>
          <label style={{ fontSize: 13, fontWeight: 600 }}>Confirmar nova senha
            <input className="form-input" type="password" style={{ marginTop: 4 }} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </label>
          <div>
            <Button type="submit" variant="primary" disabled={saving}>{saving ? 'Salvando…' : 'Alterar senha'}</Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
