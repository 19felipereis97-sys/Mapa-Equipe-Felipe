'use client';

import React, { Suspense, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await signIn('credentials', { email, password, redirect: false });
      if (res?.error) {
        setError('E-mail ou senha inválidos.');
      } else {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError('Erro ao entrar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg-page, #0F172A)', padding: 20 }}>
      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: 360, background: 'var(--bg-card, #fff)', borderRadius: 12, padding: 28, boxShadow: '0 10px 40px rgba(0,0,0,0.25)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4, color: 'var(--text-primary, #0F172A)' }}>Mapa da Equipe</h1>
        <p style={{ fontSize: 13, color: 'var(--text-secondary, #64748B)', marginBottom: 20 }}>Entre para continuar</p>

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #64748B)', marginBottom: 4 }}>E-mail</label>
        <input
          type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus
          className="form-input"
          style={{ width: '100%', height: 40, marginBottom: 14, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-color, #E2E8F0)' }}
        />

        <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #64748B)', marginBottom: 4 }}>Senha</label>
        <input
          type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
          className="form-input"
          style={{ width: '100%', height: 40, marginBottom: 18, padding: '0 12px', borderRadius: 8, border: '1px solid var(--border-color, #E2E8F0)' }}
        />

        {error && <p style={{ color: '#DC2626', fontSize: 13, marginBottom: 14 }}>{error}</p>}

        <button
          type="submit" disabled={loading}
          style={{ width: '100%', height: 42, borderRadius: 8, border: 'none', background: '#2563EB', color: '#fff', fontWeight: 600, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
        >
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
