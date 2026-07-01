'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToast } from '@/components/ui/Toast';
import { formatDocument } from '@/lib/masks';

/* ─── Types ─── */
type Urgency = 'high' | 'medium' | 'normal';

interface PortalItem {
  id: number;
  companyId: number;
  cnpj: string;
  companyName: string;
  notificationDate: string;
  subject: string;
  urgency: Urgency;
  batchName: string;
  completed: boolean;
  completedAt: string | null;
  company: { id: number; corporateName: string; groupName: string | null; code: string | null };
}

/* ─── Urgency config ─── */
const URGENCY_CFG: Record<Urgency, { label: string; color: string; bg: string; dot: string }> = {
  high:   { label: 'Alta',   color: 'var(--color-danger)',  bg: 'var(--color-danger-soft)',  dot: '#DC2626' },
  medium: { label: 'Média',  color: 'var(--color-warning)', bg: 'var(--color-warning-soft)', dot: '#EA580C' },
  normal: { label: 'Normal', color: 'var(--text-secondary)', bg: 'var(--bg-hover)',           dot: '#94A3B8' },
};

/* ─── Upload Modal ─── */
interface UploadResult { imported: number; ignored: number }

function UploadModal({ open, onClose, onUploaded }: { open: boolean; onClose: () => void; onUploaded: () => void }) {
  const [file, setFile]       = useState<File | null>(null);
  const [busy, setBusy]       = useState(false);
  const [result, setResult]   = useState<UploadResult | null>(null);
  const { addToast }          = useToast();

  useEffect(() => { if (!open) { setFile(null); setResult(null); } }, [open]);

  async function handleUpload() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/portal-notifications/upload', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setResult(json.data);
      if (json.data.imported > 0) onUploaded();
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao processar arquivo' });
    } finally { setBusy(false); }
  }

  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ width: 440, maxWidth: '95vw', display: 'flex', flexDirection: 'column' }}>
        <div className="drawer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="drawer-title">Enviar Relatório</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 22, lineHeight: 1, padding: 2 }}>×</button>
        </div>
        <div className="drawer-body" style={{ padding: 20, flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>

          <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600, marginBottom: 6 }}>Formato esperado</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
              Planilha Excel (.xlsx) com colunas: <strong>CNPJ, Empresa, Data, Assunto</strong>.
              Apenas empresas da sua carteira serão importadas.
            </p>
          </div>

          <div>
            <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>Selecionar arquivo</p>
            <input
              type="file" accept=".xlsx,.xls"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }}
              style={{ fontSize: 'var(--font-size-sm)' }}
            />
            {file && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 5 }}>{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
          </div>

          {file && !result && (
            <Button variant="primary" onClick={handleUpload} loading={busy} style={{ alignSelf: 'flex-start' }}>
              Importar
            </Button>
          )}

          {result && (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <span style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                ✓ {result.imported} importado{result.imported !== 1 ? 's' : ''}
              </span>
              {result.ignored > 0 && (
                <span style={{ background: 'var(--bg-hover)', color: 'var(--text-secondary)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', fontWeight: 600, fontSize: 'var(--font-size-sm)' }}>
                  {result.ignored} ignorado{result.ignored !== 1 ? 's' : ''} (CNPJ não cadastrado)
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Item card ─── */
function ItemCard({ item, onToggle, onDelete }: { item: PortalItem; onToggle: (id: number) => void; onDelete: (id: number) => void }) {
  const urg = URGENCY_CFG[item.urgency];
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)', padding: '14px 16px',
      borderLeft: `4px solid ${urg.dot}`,
      display: 'flex', flexDirection: 'column', gap: 8,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', flex: 1 }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: urg.bg, color: urg.color, whiteSpace: 'nowrap' }}>
            {urg.label}
          </span>
          <span style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>
            {item.company?.corporateName ?? item.companyName}
          </span>
          {item.company?.groupName && (
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>{item.company.groupName}</span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
          <button
            onClick={() => onToggle(item.id)}
            style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: `1px solid ${item.completed ? 'var(--color-warning)' : 'var(--color-success)'}`, background: 'none', cursor: 'pointer', fontSize: 'var(--font-size-xs)', fontWeight: 600, color: item.completed ? 'var(--color-warning)' : 'var(--color-success)', fontFamily: 'var(--font-family)', whiteSpace: 'nowrap' }}
          >
            {item.completed ? 'Reabrir' : 'Concluir'}
          </button>
          <button
            onClick={() => onDelete(item.id)}
            style={{ padding: '4px 8px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'none', cursor: 'pointer', fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', fontFamily: 'var(--font-family)' }}
            title="Excluir"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Subject */}
      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)', lineHeight: 1.4 }}>{item.subject}</p>

      {/* Bottom meta */}
      <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'center' }}>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
          CNPJ: {formatDocument(item.cnpj)}
        </span>
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)' }}>
          Data: {item.notificationDate}
        </span>
        {item.completed && item.completedAt && (
          <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-success)' }}>
            Concluído em {new Date(item.completedAt).toLocaleDateString('pt-BR')}
          </span>
        )}
        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-placeholder)', marginLeft: 'auto' }}>
          {item.batchName}
        </span>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function PortaisEletronicosPage() {
  const { addToast } = useToast();

  const [view, setView]         = useState<'pending' | 'history'>('pending');
  const [items, setItems]       = useState<PortalItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [uploadOpen, setUploadOpen] = useState(false);

  const [search, setSearch]     = useState('');
  const [filterUrg, setFilterUrg] = useState('');

  const hasLoadedRef = useRef(false);

  const load = useCallback(async (completed: boolean) => {
    const showInit = !hasLoadedRef.current;
    if (showInit) setLoading(true);
    try {
      const res  = await fetch(`/api/portal-notifications?completed=${completed}`);
      const json = await res.json();
      setItems(json.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar notificações' });
    } finally {
      hasLoadedRef.current = true;
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    hasLoadedRef.current = false;
    load(view === 'history');
  }, [view, load]);

  async function handleToggle(id: number) {
    try {
      const res  = await fetch(`/api/portal-notifications/${id}/complete`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setItems((prev) => prev.filter((i) => i.id !== id));
      addToast({ type: 'success', message: view === 'pending' ? 'Concluído e movido para o histórico' : 'Reaberto em Pendentes' });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao atualizar' });
    }
  }

  async function handleDelete(id: number) {
    try {
      const res  = await fetch(`/api/portal-notifications/${id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setItems((prev) => prev.filter((i) => i.id !== id));
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir' });
    }
  }

  async function handleClearHistory() {
    try {
      const res  = await fetch('/api/portal-notifications', { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setItems([]);
      addToast({ type: 'success', message: `${json.data.deleted} item${json.data.deleted !== 1 ? 's' : ''} removido${json.data.deleted !== 1 ? 's' : ''} do histórico` });
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao limpar histórico' });
    }
  }

  const filtered = useMemo(() => items.filter((i) => {
    if (search) {
      const q = search.toLowerCase();
      if (![i.companyName, i.company?.corporateName, i.subject, i.cnpj].some((f) => f?.toLowerCase().includes(q))) return false;
    }
    if (filterUrg && i.urgency !== filterUrg) return false;
    return true;
  }), [items, search, filterUrg]);

  const pendingCount = items.length; // items is already filtered by tab

  return (
    <div className="page-container" style={{ paddingBottom: 40 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Portais Eletrônicos</h1>
          <p className="page-subtitle">Notificações de portais governamentais que requerem tratativa</p>
        </div>
        <Button variant="primary" onClick={() => setUploadOpen(true)}>⬆ Enviar Relatório</Button>
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 14px' }}>
          {([
            { key: 'pending', label: 'Pendentes' },
            { key: 'history', label: 'Histórico' },
          ] as const).map((t) => {
            const isActive = view === t.key;
            return (
              <button key={t.key} onClick={() => setView(t.key)} style={{ padding: '13px 12px', background: 'none', border: 'none', borderBottom: isActive ? '2px solid var(--color-primary)' : '2px solid transparent', marginBottom: -1, cursor: 'pointer', fontSize: 'var(--font-size-sm)', fontWeight: isActive ? 600 : 400, color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)', fontFamily: 'var(--font-family)' }}>
                {t.label}
                {t.key === 'pending' && pendingCount > 0 && (
                  <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 700, background: 'var(--color-danger-soft)', color: 'var(--color-danger)', borderRadius: 10, padding: '1px 6px' }}>
                    {pendingCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Filter bar */}
        <div style={{ display: 'flex', gap: 8, padding: '10px 14px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: '2 1 200px', height: 32, fontSize: 'var(--font-size-sm)' }}
            placeholder="Buscar empresa, CNPJ ou assunto..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-select" style={{ flex: '1 1 130px', height: 32, fontSize: 'var(--font-size-sm)' }} value={filterUrg} onChange={(e) => setFilterUrg(e.target.value)}>
            <option value="">Todas as urgências</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="normal">Normal</option>
          </select>
          {(search || filterUrg) && (
            <button className="action-btn" style={{ height: 32 }} onClick={() => { setSearch(''); setFilterUrg(''); }}>Limpar</button>
          )}
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          </span>
          {view === 'history' && items.length > 0 && (
            <button
              onClick={handleClearHistory}
              style={{ padding: '4px 10px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-danger)', background: 'none', color: 'var(--color-danger)', fontSize: 'var(--font-size-xs)', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-family)', whiteSpace: 'nowrap' }}
            >
              Limpar histórico
            </button>
          )}
        </div>

        {/* Content */}
        <div style={{ padding: '14px', minHeight: 200 }}>
          {loading ? (
            <LoadingState message="Carregando notificações..." />
          ) : filtered.length === 0 ? (
            <EmptyState
              title={view === 'pending' ? 'Nenhuma pendência no momento' : 'Histórico vazio'}
              description={
                view === 'pending'
                  ? 'Envie um relatório para verificar notificações das empresas da carteira.'
                  : 'As notificações concluídas aparecerão aqui.'
              }
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map((item) => (
                <ItemCard key={item.id} item={item} onToggle={handleToggle} onDelete={handleDelete} />
              ))}
            </div>
          )}
        </div>
      </Card>

      <UploadModal
        open={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onUploaded={() => { if (view === 'pending') load(false); }}
      />
    </div>
  );
}
