'use client';

import React, { useEffect, useState } from 'react';

interface ImportResult {
  created: number;
  updated: number;
  totalDataRows: number;
  skippedEmptyRows: number;
}

interface ImportGClickDrawerProps {
  open: boolean;
  onClose: () => void;
  onImported: () => void;
}

export function ImportGClickDrawer({ open, onClose, onImported }: ImportGClickDrawerProps) {
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) { setFile(null); setResult(null); setError(null); }
  }, [open]);

  async function handleImport() {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/gclick/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
      onImported();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao importar planilha');
    } finally {
      setBusy(false);
    }
  }

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ width: 460, maxWidth: '95vw', display: 'flex', flexDirection: 'column' }}>
        <div className="drawer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="drawer-title">Importar Planilha G-Click</p>
          <button onClick={onClose} aria-label="Fechar" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 22, lineHeight: 1, padding: 2 }}>×</button>
        </div>
        <div className="drawer-body" style={{ padding: 20, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            Selecione o arquivo Excel exportado do G-Click, no layout padrão — precisa conter as colunas
            <strong> Status, Departamento, Assunto, Competência, Cliente, Status Cliente, Ação, Meta</strong> e <strong>Vencimento</strong>.
            Reimportar não duplica tarefas nem apaga o que já foi marcado como concluído.
          </p>

          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); setError(null); }}
            style={{ fontSize: 'var(--font-size-sm)' }}
          />
          {file && (
            <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
              {file.name} · {(file.size / 1024).toFixed(0)} KB
            </p>
          )}

          {error && (
            <div style={{ background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '10px 14px', fontSize: 'var(--font-size-sm)', lineHeight: 1.5 }}>
              {error}
            </div>
          )}

          {file && !result && (
            <button
              onClick={handleImport}
              disabled={busy}
              style={{ alignSelf: 'flex-start', padding: '8px 20px', borderRadius: 'var(--radius-sm)', background: busy ? 'var(--text-placeholder)' : 'var(--color-primary)', color: '#fff', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)' }}
            >
              {busy ? '⏳ Importando...' : '→ Importar'}
            </button>
          )}

          {result && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ background: 'var(--color-success-soft)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                ✓ {result.created} nova{result.created !== 1 ? 's' : ''}
              </span>
              <span style={{ background: 'var(--color-primary-soft)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                ↻ {result.updated} atualizada{result.updated !== 1 ? 's' : ''}
              </span>
              {result.skippedEmptyRows > 0 && (
                <span style={{ background: 'var(--color-warning-soft)', color: 'var(--color-warning)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                  ⚠ {result.skippedEmptyRows} linha(s) sem assunto/cliente ignorada(s)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
