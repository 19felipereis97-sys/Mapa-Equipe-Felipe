'use client';

import React, { useEffect, useState } from 'react';
import { ActivityHistoryList } from '@/components/atividades/ActivityHistoryList';
import { useToast } from '@/components/ui/Toast';
import { useAppContext } from '@/context/AppContext';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { Button } from '@/components/ui/Button';
import { formatDocument, formatMonthYear } from '@/lib/masks';
import type { Company } from '@/types/entities';

/* ─── Form types ─── */
interface CompanyForm {
  code: string;
  groupName: string;
  document: string;
  corporateName: string;
  companyType: string;
  unit: string;
  startCompetence: string;
  levelId: string;
  operationService: boolean;
  operationCommerce: boolean;
  operationIndustry: boolean;
  irRent: boolean;
  openingCompany: boolean;
  openingDate: string;
  financialResponsibleId: string;
  dpResponsibleId: string;
  fiscalResponsibleId: string;
  analysisResponsibleId: string;
  reviewResponsibleId: string;
  irRentResponsibleId: string;
  mitResponsibleId: string;
  cellTeamId: string;
  cell: string;
  terminated: boolean;
  terminationMonth: string;
  taxRegimes: Record<string, string>;
}

const EMPTY: CompanyForm = {
  code: '', groupName: '', document: '', corporateName: '',
  companyType: '', unit: '', startCompetence: '', levelId: '',
  operationService: false, operationCommerce: false, operationIndustry: false,
  irRent: false, openingCompany: false, openingDate: '',
  financialResponsibleId: '', dpResponsibleId: '', fiscalResponsibleId: '',
  analysisResponsibleId: '', reviewResponsibleId: '', irRentResponsibleId: '',
  mitResponsibleId: '', cellTeamId: '', cell: '', terminated: false, terminationMonth: '',
  taxRegimes: {},
};

function toForm(c: Company): CompanyForm {
  const taxRegimes: Record<string, string> = {};
  c.taxRegimes?.forEach((tr) => { taxRegimes[String(tr.accountingYearId)] = String(tr.taxRegimeId); });
  return {
    code: c.code ?? '',
    groupName: c.groupName ?? '',
    document: c.document ? formatDocument(c.document) : '',
    corporateName: c.corporateName,
    companyType: c.companyType ?? '',
    unit: c.unit ?? '',
    startCompetence: c.startCompetence ?? '',
    levelId: c.levelId ? String(c.levelId) : '',
    operationService: c.operationService,
    operationCommerce: c.operationCommerce,
    operationIndustry: c.operationIndustry,
    irRent: c.irRent,
    openingCompany: c.openingCompany,
    openingDate: c.openingDate ?? '',
    financialResponsibleId: c.financialResponsibleId ? String(c.financialResponsibleId) : '',
    dpResponsibleId: c.dpResponsibleId ? String(c.dpResponsibleId) : '',
    fiscalResponsibleId: c.fiscalResponsibleId ? String(c.fiscalResponsibleId) : '',
    analysisResponsibleId: c.analysisResponsibleId ? String(c.analysisResponsibleId) : '',
    reviewResponsibleId: c.reviewResponsibleId ? String(c.reviewResponsibleId) : '',
    irRentResponsibleId: c.irRentResponsibleId ? String(c.irRentResponsibleId) : '',
    mitResponsibleId: c.mitResponsibleId ? String(c.mitResponsibleId) : '',
    cellTeamId: c.cellTeamId ? String(c.cellTeamId) : '',
    cell: c.cellTeam?.name ?? c.cell ?? '',
    terminated: c.terminated,
    terminationMonth: c.terminationMonth ?? '',
    taxRegimes,
  };
}

/* ─── Props ─── */
interface Props {
  open: boolean;
  company: Company | null;
  onClose: () => void;
  onSaved: (company: Company) => void;
  onDuplicated: () => void;
  onDeleted: () => void;
}

/* ─── Main component ─── */
export function CompanyDrawer({ open, company, onClose, onSaved, onDuplicated, onDeleted }: Props) {
  const { addToast } = useToast();
  const { professionals, levels, taxRegimes: taxOptions, accountingYears, teams } = useAppContext();

  const [tab, setTab] = useState<'dados' | 'historico'>('dados');
  const [form, setForm] = useState<CompanyForm>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDup, setConfirmDup] = useState(false);
  const [duplicating, setDuplicating] = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [deleting, setDeleting]     = useState(false);
  const [termWarning, setTermWarning] = useState<{ count: number; months: number[] } | null>(null);
  const pendingSaveRef = React.useRef(false);

  const isNew = !company;

  useEffect(() => {
    if (!open) return;
    setForm(company ? toForm(company) : EMPTY);
    setErrors({});
    setTab('dados');
  }, [open, company]);

  function set<K extends keyof CompanyForm>(key: K, value: CompanyForm[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function validate(): boolean {
    const errs: Record<string, string> = {};
    if (!form.corporateName.trim()) errs.corporateName = 'Razão social é obrigatória';
    if (form.document) {
      const d = form.document.replace(/\D/g, '');
      if (d.length !== 11 && d.length !== 14) errs.document = 'CPF (11 dígitos) ou CNPJ (14 dígitos)';
    }
    if (form.openingCompany && !form.openingDate) errs.openingDate = 'Informe a data de abertura';
    if (form.terminated && !form.terminationMonth) errs.terminationMonth = 'Informe o mês de rescisão (MM/AAAA)';
    if (form.terminationMonth && !/^(0[1-9]|1[0-2])\/\d{4}$/.test(form.terminationMonth)) {
      errs.terminationMonth = 'Formato inválido — use MM/AAAA';
    }
    if (form.startCompetence && !/^(0[1-9]|1[0-2])\/\d{4}$/.test(form.startCompetence)) {
      errs.startCompetence = 'Formato inválido — use MM/AAAA';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSave() {
    if (!validate()) { addToast({ type: 'warning', message: 'Corrija os campos destacados' }); return; }

    // Rescission validation: warn if there are statuses after the termination month
    if (
      !pendingSaveRef.current &&
      form.terminated && !company?.terminated &&
      form.terminationMonth && company
    ) {
      const [mmStr, yyStr] = form.terminationMonth.split('/');
      const termMonth = parseInt(mmStr, 10);
      const termYear  = parseInt(yyStr, 10);
      try {
        const res  = await fetch(`/api/activities?companyId=${company.id}&year=${termYear}`);
        const json = await res.json();
        const after = (json.data ?? []).filter((s: { month: number }) => s.month > termMonth);
        if (after.length > 0) {
          const months = Array.from(new Set<number>(after.map((s: { month: number }) => s.month))).sort((a, b) => a - b);
          setTermWarning({ count: after.length, months });
          return;
        }
      } catch { /* ignore, proceed */ }
    }

    pendingSaveRef.current = false;
    setSaving(true);
    try {
      const cellTeam = teams.find((t) => String(t.id) === form.cellTeamId) ?? null;
      const payload = {
        code: form.code || null,
        groupName: form.groupName || null,
        document: form.document ? form.document.replace(/\D/g, '') : null,
        corporateName: form.corporateName.trim(),
        companyType: form.companyType || null,
        unit: form.unit || null,
        startCompetence: form.startCompetence || null,
        levelId: form.levelId ? Number(form.levelId) : null,
        operationService: form.operationService,
        operationCommerce: form.operationCommerce,
        operationIndustry: form.operationIndustry,
        irRent: form.irRent,
        openingCompany: form.openingCompany,
        openingDate: form.openingDate || null,
        financialResponsibleId: form.financialResponsibleId ? Number(form.financialResponsibleId) : null,
        dpResponsibleId: form.dpResponsibleId ? Number(form.dpResponsibleId) : null,
        fiscalResponsibleId: form.fiscalResponsibleId ? Number(form.fiscalResponsibleId) : null,
        analysisResponsibleId: form.analysisResponsibleId ? Number(form.analysisResponsibleId) : null,
        reviewResponsibleId: form.reviewResponsibleId ? Number(form.reviewResponsibleId) : null,
        irRentResponsibleId: form.irRentResponsibleId ? Number(form.irRentResponsibleId) : null,
        mitResponsibleId: form.mitResponsibleId ? Number(form.mitResponsibleId) : null,
        cellTeamId: form.cellTeamId ? Number(form.cellTeamId) : null,
        cell: cellTeam?.name ?? null,
        terminated: form.terminated,
        terminationMonth: form.terminationMonth || null,
        taxRegimes: Object.entries(form.taxRegimes)
          .filter(([, v]) => v !== '')
          .map(([yearId, taxId]) => ({ accountingYearId: Number(yearId), taxRegimeId: Number(taxId) })),
      };

      const url = isNew ? '/api/companies' : `/api/companies/${company.id}`;
      const method = isNew ? 'POST' : 'PUT';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      if (form.terminated) {
        addToast({ type: 'warning', message: 'Empresa rescindida. Acesse o menu Rescindidas para acompanhar as atividades.' });
      } else {
        addToast({ type: 'success', message: isNew ? 'Empresa criada com sucesso' : 'Empresa atualizada' });
      }
      onSaved(json.data);
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao salvar empresa' });
    } finally { setSaving(false); }
  }

  async function handleDuplicate() {
    setDuplicating(true);
    setConfirmDup(false);
    try {
      const res = await fetch(`/api/companies/${company!.id}/duplicate`, { method: 'POST' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast({ type: 'success', message: 'Empresa duplicada com sucesso' });
      onDuplicated();
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao duplicar' });
    } finally { setDuplicating(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    setConfirmDel(false);
    try {
      const res = await fetch(`/api/companies/${company!.id}`, { method: 'DELETE' });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      addToast({ type: 'success', message: 'Empresa excluída com sucesso' });
      onDeleted();
    } catch (e: unknown) {
      addToast({ type: 'error', message: e instanceof Error ? e.message : 'Erro ao excluir empresa' });
    } finally { setDeleting(false); }
  }

  const profOpts = professionals.map((p) => ({ value: String(p.id), label: p.name }));
  const levelOpts = levels.map((l) => ({ value: String(l.id), label: l.name }));
  const taxOpts = taxOptions.map((t) => ({ value: String(t.id), label: t.name }));
  const teamOpts = teams.map((t) => ({ value: String(t.id), label: t.name }));

  if (!open) return null;

  return (
    <>
      <div className="drawer-overlay" onClick={onClose} />
      <div className="drawer" style={{ width: 520, maxWidth: '95vw', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div className="drawer-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10, paddingBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              {isNew ? (
                <p className="drawer-title">Nova Empresa</p>
              ) : (
                <>
                  <p className="drawer-title" style={{ fontSize: 'var(--font-size-md)', lineHeight: 1.3, wordBreak: 'break-word' }}>
                    {company.corporateName}
                  </p>
                  {(company.code || company.groupName) && (
                    <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)', marginTop: 3 }}>
                      {[company.code && `COD ${company.code}`, company.groupName && `Grupo ${company.groupName}`].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </>
              )}
            </div>
            <button onClick={onClose} aria-label="Fechar"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', fontSize: 22, lineHeight: 1, padding: 2, flexShrink: 0 }}>
              ×
            </button>
          </div>
          <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
            {!isNew ? (
              <Button
                variant="secondary" size="sm"
                onClick={() => setConfirmDel(true)}
                disabled={saving || duplicating || deleting}
                style={{ color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
              >
                {deleting ? 'Excluindo…' : 'Excluir'}
              </Button>
            ) : <span />}
            <div style={{ display: 'flex', gap: 8 }}>
              {!isNew && (
                <Button variant="secondary" size="sm" onClick={() => setConfirmDup(true)} disabled={saving || duplicating || deleting}>
                  Duplicar
                </Button>
              )}
              <Button variant="primary" size="sm" onClick={handleSave} loading={saving} disabled={deleting}>
                Salvar
              </Button>
            </div>
          </div>
        </div>

        {/* ── Tabs (existing company only) ── */}
        {!isNew && (
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', padding: '0 20px' }}>
            {(['dados', 'historico'] as const).map((t) => (
              <button key={t} className={`tab-button${tab === t ? ' active' : ''}`} onClick={() => setTab(t)}
                style={{ textTransform: 'capitalize' }}>
                {t === 'dados' ? 'Dados' : 'Histórico'}
              </button>
            ))}
          </div>
        )}

        {/* ── Body ── */}
        <div className="drawer-body" style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {tab === 'historico' ? (
            <ActivityHistoryList companyId={company!.id} showFilters={true} limit={50} />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

              {/* === IDENTIFICAÇÃO === */}
              <Section title="Identificação">
                <div className="form-grid-2">
                  <Field label="COD">
                    <input className="form-input" value={form.code} onChange={(e) => set('code', e.target.value)} placeholder="Código interno" />
                  </Field>
                  <Field label="Grupo">
                    <input className="form-input" value={form.groupName} onChange={(e) => set('groupName', e.target.value)} placeholder="Nome do grupo" />
                  </Field>
                  <Field label="CNPJ / CPF" error={errors.document}>
                    <input className="form-input" value={form.document}
                      onChange={(e) => set('document', formatDocument(e.target.value))}
                      placeholder="00.000.000/0000-00" />
                  </Field>
                  <Field label="Razão Social *" error={errors.corporateName} full>
                    <input className="form-input" value={form.corporateName}
                      onChange={(e) => set('corporateName', e.target.value)}
                      placeholder="Razão social completa"
                      autoFocus={isNew}
                      style={{ borderColor: errors.corporateName ? 'var(--color-danger)' : undefined }} />
                  </Field>
                  <Field label="Tipo">
                    <select className="form-select" value={form.companyType} onChange={(e) => set('companyType', e.target.value)}>
                      <option value="">Selecionar...</option>
                      <option value="MATRIZ">MATRIZ</option>
                      <option value="FILIAL">FILIAL</option>
                    </select>
                  </Field>
                  <Field label="Unidade">
                    <input className="form-input" value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="Unidade" />
                  </Field>
                  <Field label="Início de Competência" error={errors.startCompetence}>
                    <input className="form-input" value={form.startCompetence}
                      onChange={(e) => set('startCompetence', formatMonthYear(e.target.value))}
                      placeholder="MM/AAAA" />
                  </Field>
                  <Field label="Nível">
                    <select className="form-select" value={form.levelId} onChange={(e) => set('levelId', e.target.value)}>
                      <option value="">—</option>
                      {levelOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              {/* === TRIBUTAÇÃO === */}
              <Section title="Tributação por Ano">
                {accountingYears.length === 0 ? (
                  <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-secondary)' }}>
                    Nenhum ano contábil cadastrado. Acesse Configurações → Ano Contábil.
                  </p>
                ) : (
                  <div className="form-grid-2">
                    {accountingYears.map((yr) => (
                      <Field key={yr.id} label={`${yr.year}${yr.active ? ' (ativo)' : ''}`}>
                        <select className="form-select"
                          value={form.taxRegimes[String(yr.id)] ?? ''}
                          onChange={(e) => set('taxRegimes', { ...form.taxRegimes, [String(yr.id)]: e.target.value })}>
                          <option value="">Sem tributação</option>
                          {taxOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                        </select>
                      </Field>
                    ))}
                  </div>
                )}
              </Section>

              {/* === TIPO DE OPERAÇÃO === */}
              <Section title="Tipo de Operação">
                <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                  <Check label="Serviço" checked={form.operationService} onChange={(v) => set('operationService', v)} />
                  <Check label="Comércio" checked={form.operationCommerce} onChange={(v) => set('operationCommerce', v)} />
                  <Check label="Indústria" checked={form.operationIndustry} onChange={(v) => set('operationIndustry', v)} />
                </div>
              </Section>

              {/* === CONFIGURAÇÕES === */}
              <Section title="Configurações">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Check label="Sujeita a IR Aluguel" checked={form.irRent} onChange={(v) => set('irRent', v)} />
                  <Check label="Empresa de Abertura" checked={form.openingCompany} onChange={(v) => set('openingCompany', v)} />
                  {form.openingCompany && (
                    <div style={{ paddingLeft: 24 }}>
                      <Field label="Data de Abertura *" error={errors.openingDate}>
                        <input type="date" className="form-input" value={form.openingDate}
                          onChange={(e) => set('openingDate', e.target.value)}
                          style={{ borderColor: errors.openingDate ? 'var(--color-danger)' : undefined }} />
                      </Field>
                    </div>
                  )}
                </div>
              </Section>

              {/* === RESPONSÁVEIS === */}
              <Section title="Responsáveis">
                <div className="form-grid-2">
                  {([
                    ['Resp. Financeiro', 'financialResponsibleId'],
                    ['Resp. DP',         'dpResponsibleId'],
                    ['Resp. Fiscal',     'fiscalResponsibleId'],
                    ['Resp. Análise',    'analysisResponsibleId'],
                    ['Resp. Revisão',    'reviewResponsibleId'],
                    ['Resp. IR Aluguel', 'irRentResponsibleId'],
                    ['Resp. MIT',        'mitResponsibleId'],
                  ] as [string, keyof CompanyForm][]).map(([label, key]) => (
                    <Field key={key} label={label}>
                      <select className="form-select"
                        value={String(form[key] ?? '')}
                        onChange={(e) => set(key, e.target.value)}>
                        <option value="">—</option>
                        {profOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </Field>
                  ))}
                  <Field label="Célula">
                    <select className="form-select" value={form.cellTeamId} onChange={(e) => set('cellTeamId', e.target.value)}>
                      <option value="">—</option>
                      {teamOpts.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                </div>
              </Section>

              {/* === STATUS === */}
              <Section title="Status">
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <Check label="Empresa rescindida" checked={form.terminated} onChange={(v) => set('terminated', v)} />
                  {form.terminated && (
                    <div style={{ paddingLeft: 24 }}>
                      <Field label="Mês de Rescisão *" error={errors.terminationMonth}>
                        <input className="form-input" value={form.terminationMonth}
                          onChange={(e) => set('terminationMonth', formatMonthYear(e.target.value))}
                          placeholder="MM/AAAA"
                          style={{ borderColor: errors.terminationMonth ? 'var(--color-danger)' : undefined }} />
                      </Field>
                    </div>
                  )}
                </div>
              </Section>

            </div>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmDup}
        onClose={() => setConfirmDup(false)}
        onConfirm={handleDuplicate}
        title="Duplicar empresa"
        message={`Duplicar "${company?.corporateName}"? Uma cópia completa será criada com os mesmos dados.`}
        confirmLabel="Duplicar"
        variant="primary"
        loading={duplicating}
      />

      <ConfirmDialog
        open={termWarning !== null}
        onClose={() => setTermWarning(null)}
        onConfirm={() => { setTermWarning(null); pendingSaveRef.current = true; handleSave(); }}
        title="Atenção — status após a rescisão"
        message={
          termWarning
            ? `Existem ${termWarning.count} status lançado(s) nos meses ${termWarning.months.join(', ')} que ficarão bloqueados após a rescisão em ${form.terminationMonth}. Os dados serão preservados mas ocultos. Deseja continuar?`
            : ''
        }
        confirmLabel="Rescindir mesmo assim"
        variant="danger"
      />

      {/* Confirmação de exclusão */}
      <ConfirmDialog
        open={confirmDel}
        title="Excluir empresa"
        message={`Tem certeza que deseja excluir "${company?.corporateName}"? Todo o histórico de atividades será removido permanentemente. Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir permanentemente"
        variant="danger"
        onConfirm={handleDelete}
        onClose={() => setConfirmDel(false)}
      />
    </>
  );
}

/* ─── Helpers ─── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p style={{
        fontSize: 'var(--font-size-xs)', fontWeight: 700, color: 'var(--text-secondary)',
        textTransform: 'uppercase', letterSpacing: '0.08em',
        marginBottom: 12, paddingBottom: 6, borderBottom: '1px solid var(--border-color)',
      }}>
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, error, children, full }: { label: string; error?: string; children: React.ReactNode; full?: boolean }) {
  return (
    <div className="form-group" style={full ? { gridColumn: 'span 2' } : undefined}>
      <label className="form-label">{label}</label>
      {children}
      {error && <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-danger)' }}>{error}</span>}
    </div>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', userSelect: 'none' }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)}
        style={{ width: 15, height: 15, cursor: 'pointer', accentColor: 'var(--color-primary)' }} />
      <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-primary)' }}>{label}</span>
    </label>
  );
}
