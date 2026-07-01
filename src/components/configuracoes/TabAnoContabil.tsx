'use client';

import React, { useEffect, useState } from 'react';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { LoadingState } from '@/components/ui/LoadingState';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { AccountingYear } from '@/types/entities';
import { useAppContext } from '@/context/AppContext';

export function TabAnoContabil() {
  const { addToast } = useToast();
  const { refreshAppData } = useAppContext();

  const [years, setYears] = useState<AccountingYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [newYear, setNewYear] = useState('');
  const [newYearError, setNewYearError] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch('/api/accounting-years');
      const json = await res.json();
      setYears(json.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar anos contábeis' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function handleSetActive(id: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/accounting-years/${id}`, { method: 'PUT' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      await load();
      refreshAppData();
      addToast({ type: 'success', message: 'Ano contábil ativado com sucesso' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao ativar ano' });
    } finally {
      setSaving(false);
    }
  }

  function validateNewYear(): boolean {
    const val = Number(newYear);
    if (!newYear || isNaN(val)) { setNewYearError('Informe um ano válido'); return false; }
    if (val < 2024 || val > 2100) { setNewYearError('Ano deve estar entre 2024 e 2100'); return false; }
    if (years.some((y) => y.year === val)) { setNewYearError('Este ano já está cadastrado'); return false; }
    setNewYearError('');
    return true;
  }

  function handleOpenNewYear() {
    if (!validateNewYear()) return;
    setConfirmOpen(true);
  }

  async function confirmNewYear() {
    setSaving(true);
    setConfirmOpen(false);
    try {
      const res = await fetch('/api/accounting-years', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ year: Number(newYear) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setNewYear(''); setNewYearError('');
      await load();
      refreshAppData();
      addToast({ type: 'success', message: `Ano ${newYear} aberto com sucesso` });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao abrir ano' });
    } finally { setSaving(false); }
  }

  return (
    <>
      <Card>
        {loading ? (
          <LoadingState message="Carregando anos contábeis..." />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
            <div>
              <p className="card-title" style={{ marginBottom: 4 }}>Ano ativo</p>
              <p className="card-subtitle" style={{ marginBottom: 16, lineHeight: 1.6 }}>
                Clique em um ano para torná-lo ativo. O ano ativo define qual tributação será usada para filtrar as obrigações.
              </p>
              {years.length === 0 ? (
                <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>Nenhum ano cadastrado ainda.</p>
              ) : (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {years.map((y) => (
                    <button
                      key={y.id}
                      onClick={() => !y.active && handleSetActive(y.id)}
                      disabled={saving || y.active}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 6,
                        padding: '8px 20px',
                        borderRadius: 'var(--radius-sm)',
                        border: `2px solid ${y.active ? 'var(--color-primary)' : 'var(--border-color)'}`,
                        background: y.active ? 'var(--color-primary)' : 'var(--bg-card)',
                        color: y.active ? '#FFFFFF' : 'var(--text-primary)',
                        fontWeight: y.active ? 700 : 500,
                        fontSize: 'var(--font-size-md)',
                        cursor: y.active ? 'default' : 'pointer',
                        transition: 'all var(--transition-fast)',
                        opacity: saving && !y.active ? 0.5 : 1,
                      }}
                    >
                      {y.active && <span>✓</span>}
                      {y.year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: 24 }}>
              <p className="card-title" style={{ marginBottom: 4 }}>Abrir novo ano</p>
              <p className="card-subtitle" style={{ marginBottom: 16, lineHeight: 1.6 }}>
                Ao abrir um novo ano, o sistema permitirá informar a tributação desse período no cadastro das empresas. O SPED ECD e o SPED ECF usarão a tributação do ano anterior.
              </p>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div>
                  <input
                    className="form-input"
                    type="number"
                    min={2024}
                    max={2100}
                    value={newYear}
                    onChange={(e) => { setNewYear(e.target.value); setNewYearError(''); }}
                    placeholder="Ex: 2026"
                    style={{ width: 120 }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleOpenNewYear(); }}
                  />
                  {newYearError && (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)', marginTop: 4 }}>
                      {newYearError}
                    </p>
                  )}
                </div>
                <Button variant="secondary" onClick={handleOpenNewYear} loading={saving}>
                  Abrir ano
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={confirmNewYear}
        title="Abrir novo ano contábil"
        message={`Deseja abrir o ano ${newYear}? Ele será adicionado à lista de anos disponíveis no sistema.`}
        confirmLabel="Abrir ano"
        variant="primary"
        loading={saving}
      />

    </>
  );
}
