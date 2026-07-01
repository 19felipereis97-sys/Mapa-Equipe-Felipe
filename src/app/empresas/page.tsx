'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { useToast } from '@/components/ui/Toast';
import { useAppContext } from '@/context/AppContext';
import { CompanyDrawer } from '@/components/empresas/CompanyDrawer';
import type { Company, TaxRegime, Level } from '@/types/entities';
import { formatDocument } from '@/lib/masks';

/* ─── Helpers ─── */
const PLACEHOLDER: React.CSSProperties = { color: 'var(--text-placeholder)' };

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : null;
}

function colorBadgeStyle(hex: string): React.CSSProperties {
  const rgb = hexToRgb(hex);
  if (!rgb) return {};
  return {
    background: `rgba(${rgb.r},${rgb.g},${rgb.b},0.12)`,
    color: hex,
    border: `1px solid rgba(${rgb.r},${rgb.g},${rgb.b},0.3)`,
  };
}

/* MATRIZ/FILIAL badge */
function CompanyTypeBadge({ type }: { type: string | null }) {
  if (!type) return null;
  const isMatriz = type.toUpperCase() === 'MATRIZ';
  const style: React.CSSProperties = isMatriz
    ? { background: 'var(--color-primary-soft)', color: 'var(--color-primary)', border: '1px solid rgba(37,99,235,0.25)' }
    : { background: '#FEF3C7', color: '#D97706', border: '1px solid rgba(217,119,6,0.25)' };
  return (
    <span style={{
      ...style,
      fontSize: 10, fontWeight: 700,
      padding: '1px 5px', borderRadius: 3,
      letterSpacing: '0.05em', whiteSpace: 'nowrap',
      verticalAlign: 'middle', flexShrink: 0,
    }}>
      {type.toUpperCase()}
    </span>
  );
}

/* Tributação badge with color */
function TaxBadge({ regime }: { regime: TaxRegime | null | undefined }) {
  if (!regime) return <span style={PLACEHOLDER}>—</span>;
  const extra = regime.color ? colorBadgeStyle(regime.color) : {
    background: 'var(--bg-hover)',
    color: 'var(--text-primary)',
    border: '1px solid var(--border-color)',
  };
  return (
    <span style={{
      ...extra,
      display: 'inline-block',
      padding: '2px 8px',
      borderRadius: 4,
      fontWeight: 600,
      fontSize: 'var(--font-size-sm)',
      whiteSpace: 'nowrap',
    }}>
      {regime.name}
    </span>
  );
}

/* Nível chip with color */
function LevelChip({ company, levels }: { company: Company; levels: Level[] }) {
  const l = levels.find((x) => x.id === company.levelId);
  if (!l) return <span style={PLACEHOLDER}>—</span>;
  const chipStyle: React.CSSProperties = l.color
    ? {
        background: `${l.color}18`,
        color: l.color,
        border: `1px solid ${l.color}40`,
      }
    : {
        background: 'var(--bg-hover)',
        color: 'var(--text-secondary)',
        border: '1px solid var(--border-color)',
      };
  return (
    <span style={{
      ...chipStyle,
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '2px 7px', borderRadius: 4,
      fontSize: 'var(--font-size-sm)', fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {l.color && (
        <span style={{ width: 7, height: 7, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
      )}
      {l.name}
    </span>
  );
}

function RespCell({ prof }: { prof: { name: string } | null | undefined }) {
  if (!prof) return <span style={PLACEHOLDER}>—</span>;
  return <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{prof.name}</span>;
}

function OperacaoCell({ c }: { c: Company }) {
  const parts: string[] = [];
  if (c.operationService)  parts.push('Serviço');
  if (c.operationCommerce) parts.push('Comércio');
  if (c.operationIndustry) parts.push('Indústria');
  if (parts.length === 0) return <span style={PLACEHOLDER}>—</span>;
  return <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{parts.join(', ')}</span>;
}

/* ─── Import modal ─── */
interface ImportResult { row: number; status: 'ok' | 'error'; name: string; error?: string; warning?: string; action?: 'created' | 'updated' }

function ImportModal({ open, onClose, onImported }: { open: boolean; onClose: () => void; onImported: () => void }) {
  const [file, setFile]       = useState<File | null>(null);
  const [busy, setBusy]       = useState(false);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [summary, setSummary] = useState<{ created: number; updated: number; errors: number; warnings: number } | null>(null);
  const { addToast }          = useToast();

  useEffect(() => { if (!open) { setFile(null); setResults(null); setSummary(null); } }, [open]);

  async function handleDownloadTemplate() {
    try {
      const res  = await fetch('/api/companies/import/template');
      if (!res.ok) throw new Error('Erro ao gerar modelo');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href = url; a.download = 'modelo_importacao_empresas.xlsx';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch { addToast({ type: 'error', message: 'Erro ao baixar modelo' }); }
  }

  async function handleImport() {
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res  = await fetch('/api/companies/import', { method: 'POST', body: fd });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setSummary({
        created: json.data.created,
        updated: json.data.updated ?? 0,
        errors: json.data.errors,
        warnings: json.data.warnings ?? 0,
      });
      setResults(json.data.results);
      if (json.data.created > 0 || json.data.updated > 0) onImported();
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro na importação' });
    } finally { setBusy(false); }
  }

  if (!open) return null;
  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ width: 480, maxWidth: '96vw', display: 'flex', flexDirection: 'column' }}>
        <div className="drawer-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p className="drawer-title">Importar Empresas</p>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 22, lineHeight: 1, padding: 2 }}>×</button>
        </div>
        <div className="drawer-body" style={{ padding: 20, flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Step 1 — download template */}
          <div style={{ background: 'var(--bg-hover)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
            <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 6 }}>1. Baixar modelo</p>
            <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginBottom: 10 }}>
              O modelo já vem preenchido com seus níveis, tributações e profissionais cadastrados na aba <em>Referência</em>.
            </p>
            <button
              onClick={handleDownloadTemplate}
              style={{ padding: '6px 14px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--color-primary)', background: 'var(--color-primary-soft)', color: 'var(--color-primary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontWeight: 600, fontFamily: 'var(--font-family)' }}
            >
              ⬇ Baixar modelo .xlsx
            </button>
          </div>

          {/* Step 2 — upload */}
          <div>
            <p style={{ fontWeight: 600, fontSize: 'var(--font-size-sm)', marginBottom: 8 }}>2. Enviar planilha preenchida</p>
            <input type="file" accept=".xlsx,.xls" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResults(null); setSummary(null); }} style={{ fontSize: 'var(--font-size-sm)' }} />
            {file && <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--text-secondary)', marginTop: 5 }}>{file.name} · {(file.size / 1024).toFixed(0)} KB</p>}
          </div>

          {/* Import button */}
          {file && !results && (
            <button
              onClick={handleImport} disabled={busy}
              style={{ alignSelf: 'flex-start', padding: '8px 20px', borderRadius: 'var(--radius-sm)', background: busy ? 'var(--text-placeholder)' : 'var(--color-primary)', color: '#fff', border: 'none', cursor: busy ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: 'var(--font-size-sm)', fontFamily: 'var(--font-family)' }}
            >
              {busy ? '⏳ Importando...' : '→ Importar'}
            </button>
          )}

          {/* Results */}
          {summary && (
            <div>
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
                <span style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-success)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                  ✓ {summary.created} empresa{summary.created !== 1 ? 's' : ''} criada{summary.created !== 1 ? 's' : ''}
                </span>
                {summary.updated > 0 && (
                  <span style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--color-primary)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                    ↻ {summary.updated} empresa{summary.updated !== 1 ? 's' : ''} atualizada{summary.updated !== 1 ? 's' : ''} (código já cadastrado)
                  </span>
                )}
                {summary.warnings > 0 && (
                  <span style={{ background: 'rgba(234,88,12,0.1)', color: 'var(--color-warning)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                    ⚠ {summary.warnings} alerta{summary.warnings !== 1 ? 's' : ''}
                  </span>
                )}
                {summary.errors > 0 && (
                  <span style={{ background: 'rgba(220,38,38,0.1)', color: 'var(--color-danger)', borderRadius: 'var(--radius-sm)', padding: '4px 12px', fontWeight: 700, fontSize: 'var(--font-size-sm)' }}>
                    ✗ {summary.errors} erro{summary.errors !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
              {results && results.some((r) => r.warning || r.status === 'error') && (
                <div style={{ maxHeight: 220, overflowY: 'auto', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-sm)', padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {results.filter((r) => r.status === 'error').map((r) => (
                    <p key={`e-${r.row}`} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-danger)', margin: 0 }}>
                      <strong>Linha {r.row}:</strong> {r.name} — {r.error}
                    </p>
                  ))}
                  {results.filter((r) => r.warning).map((r) => (
                    <p key={`w-${r.row}`} style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-warning)', margin: 0 }}>
                      <strong>Linha {r.row}:</strong> {r.name} — ⚠ {r.warning}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

/* ─── Page ─── */
export default function EmpresasPage() {
  const { addToast } = useToast();
  const { levels, taxRegimes, professionals, activeYear } = useAppContext();

  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const hasLoadedRef = useRef(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selected, setSelected] = useState<Company | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [search, setSearch]         = useState('');
  const [filterGroup, setFilterGroup] = useState('');
  const [filterTax, setFilterTax]   = useState('');
  const [filterLevel, setFilterLevel] = useState('');
  const [filterResp, setFilterResp] = useState('');
  const [filterType, setFilterType] = useState('');   // '' | 'MATRIZ' | 'FILIAL' | 'NONE'

  const load = useCallback(async () => {
    const showInitialLoading = !hasLoadedRef.current;
    if (showInitialLoading) setLoading(true);
    try {
      const res = await fetch('/api/companies');
      const json = await res.json();
      setCompanies(json.data ?? []);
    } catch {
      addToast({ type: 'error', message: 'Erro ao carregar empresas' });
    } finally {
      hasLoadedRef.current = true;
      if (showInitialLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const validIds = new Set(companies.map((c) => c.id));
      const next = new Set(Array.from(prev).filter((id) => validIds.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [companies]);

  const groups = useMemo(
    () => Array.from(new Set(companies.map((c) => c.groupName).filter(Boolean) as string[])).sort(),
    [companies]
  );

  const filtered = useMemo(() => {
    return companies.filter((c) => {
      if (search) {
        const q = search.toLowerCase();
        const hit = [c.corporateName, c.groupName, c.code, c.document]
          .some((f) => f?.toLowerCase().includes(q));
        if (!hit) return false;
      }
      if (filterGroup && c.groupName !== filterGroup) return false;
      if (filterTax) {
        const tr = c.taxRegimes?.find((r) => r.accountingYearId === activeYear?.id);
        if (!tr || String(tr.taxRegimeId) !== filterTax) return false;
      }
      if (filterLevel && String(c.levelId) !== filterLevel) return false;
      if (filterResp) {
        const rid = Number(filterResp);
        const hit = [
          c.financialResponsibleId, c.dpResponsibleId, c.fiscalResponsibleId,
          c.analysisResponsibleId, c.reviewResponsibleId, c.irRentResponsibleId, c.mitResponsibleId,
        ].some((id) => id === rid);
        if (!hit) return false;
      }
      if (filterType) {
        if (filterType === 'NONE') {
          if (c.companyType) return false;
        } else if (c.companyType?.toUpperCase() !== filterType) {
          return false;
        }
      }
      return true;
    });
  }, [companies, search, filterGroup, filterTax, filterLevel, filterResp, filterType, activeYear]);

  const hasFilters = !!(search || filterGroup || filterTax || filterLevel || filterResp || filterType);

  function clearFilters() {
    setSearch(''); setFilterGroup(''); setFilterTax('');
    setFilterLevel(''); setFilterResp(''); setFilterType('');
  }

  function openNew()           { setSelected(null); setDrawerOpen(true); }
  function openEdit(c: Company) { setSelected(c);   setDrawerOpen(true); }

  function handleSaved(saved: Company) { setSelected(saved); load(); }
  function handleDuplicated()          { load(); setDrawerOpen(false); }
  function handleDeleted()             { load(); setDrawerOpen(false); setSelected(null); }

  function toggleSelectRow(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => (prev.size === filtered.length ? new Set() : new Set(filtered.map((c) => c.id))));
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      const res = await fetch('/api/companies/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast({ type: 'success', message: `${selectedIds.size} empresa${selectedIds.size !== 1 ? 's' : ''} excluída${selectedIds.size !== 1 ? 's' : ''} com sucesso` });
      setSelectedIds(new Set());
      setBulkDeleteOpen(false);
      load();
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir empresas' });
    } finally {
      setBulkDeleting(false);
    }
  }

  return (
    <div className="page-container">
      <PageHeader
        title="Empresas"
        subtitle={`${companies.length} empresa${companies.length !== 1 ? 's' : ''} cadastrada${companies.length !== 1 ? 's' : ''}`}
        actions={
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" onClick={() => setImportOpen(true)}>⬆ Importar</Button>
            <Button variant="primary" onClick={openNew}>+ Nova Empresa</Button>
          </div>
        }
      />

      {/* ── Filtros ── */}
      <Card style={{ marginBottom: 16, padding: '14px 16px' } as React.CSSProperties}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            className="form-input"
            style={{ flex: '2 1 220px', minWidth: 160 }}
            placeholder="Buscar empresa, grupo, CPF, CNPJ..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select className="form-select" style={{ flex: '1 1 140px', minWidth: 120 }}
            value={filterGroup} onChange={(e) => setFilterGroup(e.target.value)}>
            <option value="">Todos os grupos</option>
            {groups.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <select className="form-select" style={{ flex: '1 1 120px', minWidth: 110 }}
            value={filterType} onChange={(e) => setFilterType(e.target.value)}>
            <option value="">Tipo (todos)</option>
            <option value="MATRIZ">Matriz</option>
            <option value="FILIAL">Filial</option>
            <option value="NONE">Sem tipo</option>
          </select>
          <select className="form-select" style={{ flex: '1 1 140px', minWidth: 120 }}
            value={filterTax} onChange={(e) => setFilterTax(e.target.value)}>
            <option value="">Tributação</option>
            {taxRegimes.map((t) => <option key={t.id} value={String(t.id)}>{t.name}</option>)}
          </select>
          <select className="form-select" style={{ flex: '1 1 120px', minWidth: 100 }}
            value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
            <option value="">Nível</option>
            {levels.map((l) => <option key={l.id} value={String(l.id)}>{l.name}</option>)}
          </select>
          <select className="form-select" style={{ flex: '1 1 150px', minWidth: 120 }}
            value={filterResp} onChange={(e) => setFilterResp(e.target.value)}>
            <option value="">Responsável</option>
            {professionals.map((p) => <option key={p.id} value={String(p.id)}>{p.name}</option>)}
          </select>
          {hasFilters && (
            <Button variant="secondary" size="sm" onClick={clearFilters}>Limpar filtros</Button>
          )}
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginLeft: 'auto', whiteSpace: 'nowrap' }}>
            {hasFilters
              ? `${filtered.length} de ${companies.length} empresa${companies.length !== 1 ? 's' : ''}`
              : `${companies.length} empresa${companies.length !== 1 ? 's' : ''}`}
          </span>
        </div>
      </Card>

      {/* ── Ações em lote ── */}
      {selectedIds.size > 0 && (
        <Card style={{ marginBottom: 16, padding: '10px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' } as React.CSSProperties}>
          <span style={{ fontSize: 'var(--font-size-sm)', fontWeight: 600 }}>
            {selectedIds.size} empresa{selectedIds.size !== 1 ? 's' : ''} selecionada{selectedIds.size !== 1 ? 's' : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Button variant="secondary" size="sm" onClick={() => setSelectedIds(new Set())}>Limpar seleção</Button>
            <Button
              variant="secondary" size="sm"
              onClick={() => setBulkDeleteOpen(true)}
              style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
            >
              Excluir selecionadas
            </Button>
          </div>
        </Card>
      )}

      {/* ── Tabela ── */}
      <Card>
        {loading ? (
          <LoadingState message="Carregando empresas..." />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={hasFilters ? 'Nenhuma empresa encontrada' : 'Nenhuma empresa cadastrada ainda'}
            description={
              hasFilters
                ? 'Nenhuma empresa encontrada para os filtros aplicados.'
                : 'Clique em + Nova Empresa para começar.'
            }
          />
        ) : (
          <div className="table-wrapper" style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 'calc(100vh - 220px)' }}>
            <table style={{ minWidth: 1940, fontSize: 'var(--font-size-sm)' }}>
              <thead>
                <tr>
                  <th style={{ width: 32 }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && selectedIds.size === filtered.length}
                      onChange={toggleSelectAll}
                    />
                  </th>
                  <th style={{ width: 65 }}>Cód.</th>
                  <th style={{ width: 95 }}>Grupo</th>
                  <th style={{ minWidth: 200 }}>Razão Social</th>
                  <th style={{ width: 75 }}>Tipo</th>
                  <th style={{ width: 145 }}>CNPJ / CPF</th>
                  <th style={{ width: 150 }}>Trib. Atual</th>
                  <th style={{ width: 150 }}>Trib. Ano Ant.</th>
                  <th style={{ width: 110 }}>Nível</th>
                  <th style={{ width: 120 }}>Operação</th>
                  <th style={{ width: 80 }}>Início</th>
                  <th style={{ width: 130 }}>Financeiro</th>
                  <th style={{ width: 130 }}>DP</th>
                  <th style={{ width: 130 }}>Fiscal</th>
                  <th style={{ width: 130 }}>Análise</th>
                  <th style={{ width: 130 }}>Revisão</th>
                  <th style={{ width: 130 }}>IR Aluguel</th>
                  <th style={{ width: 130 }}>MIT</th>
                  <th style={{ width: 85 }}>Célula</th>
                  <th style={{ width: 55, textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const activeTax = c.taxRegimes?.find((tr) => tr.accountingYearId === activeYear?.id);
                  const taxRegime = activeTax
                    ? taxRegimes.find((t) => t.id === activeTax.taxRegimeId) ?? activeTax.taxRegime ?? null
                    : null;

                  const prevTax = c.taxRegimes?.find((tr) => tr.accountingYear?.year === (activeYear?.year ? activeYear.year - 1 : -1));
                  const prevTaxRegime = prevTax
                    ? taxRegimes.find((t) => t.id === prevTax.taxRegimeId) ?? prevTax.taxRegime ?? null
                    : null;

                  return (
                    <tr key={c.id} style={{ cursor: 'pointer' }} onClick={() => openEdit(c)}>

                      {/* Checkbox */}
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(c.id)}
                          onChange={() => toggleSelectRow(c.id)}
                        />
                      </td>

                      {/* Cód */}
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                        {c.code ?? '—'}
                      </td>

                      {/* Grupo */}
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {c.groupName ?? '—'}
                      </td>

                      {/* Razão Social */}
                      <td style={{ whiteSpace: 'normal', minWidth: 200 }}>
                        <span style={{ fontWeight: 500, color: 'var(--text-primary)' }}>{c.corporateName}</span>
                      </td>

                      {/* Tipo */}
                      <td><CompanyTypeBadge type={c.companyType} /></td>

                      {/* CNPJ / CPF */}
                      <td style={{ fontFamily: 'monospace', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {c.document ? formatDocument(c.document) : <span style={PLACEHOLDER}>—</span>}
                      </td>

                      {/* Tributação atual */}
                      <td>
                        <TaxBadge regime={taxRegime as TaxRegime | null} />
                      </td>

                      {/* Tributação ano anterior */}
                      <td>
                        <TaxBadge regime={prevTaxRegime as TaxRegime | null} />
                      </td>

                      {/* Nível com chip colorido */}
                      <td><LevelChip company={c} levels={levels} /></td>

                      {/* Operação */}
                      <td><OperacaoCell c={c} /></td>

                      {/* Início de competência */}
                      <td style={{ color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                        {c.startCompetence ?? <span style={PLACEHOLDER}>—</span>}
                      </td>

                      {/* Responsáveis */}
                      <td><RespCell prof={c.financialResponsible} /></td>
                      <td><RespCell prof={c.dpResponsible} /></td>
                      <td><RespCell prof={c.fiscalResponsible} /></td>
                      <td><RespCell prof={c.analysisResponsible} /></td>
                      <td><RespCell prof={c.reviewResponsible} /></td>
                      <td><RespCell prof={c.irRentResponsible} /></td>
                      <td><RespCell prof={c.mitResponsible} /></td>

                      {/* Célula */}
                      <td style={{ color: 'var(--text-secondary)' }}>
                        {c.cellTeam?.name ?? c.cell ?? <span style={PLACEHOLDER}>—</span>}
                      </td>

                      {/* Ações */}
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: 'right' }}>
                        <button className="action-btn" onClick={(e) => { e.stopPropagation(); openEdit(c); }}>
                          Editar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <CompanyDrawer
        open={drawerOpen}
        company={selected}
        onClose={() => setDrawerOpen(false)}
        onSaved={handleSaved}
        onDuplicated={handleDuplicated}
        onDeleted={handleDeleted}
      />

      <ImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={load}
      />

      <ConfirmDialog
        open={bulkDeleteOpen}
        onClose={() => setBulkDeleteOpen(false)}
        onConfirm={handleBulkDelete}
        title="Excluir empresas selecionadas"
        message={`Tem certeza que deseja excluir ${selectedIds.size} empresa${selectedIds.size !== 1 ? 's' : ''}? Todo o histórico de atividades será removido permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir permanentemente"
        variant="danger"
        loading={bulkDeleting}
      />
    </div>
  );
}
