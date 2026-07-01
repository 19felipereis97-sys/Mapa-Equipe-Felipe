'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAppContext } from '@/context/AppContext';
import { LoadingState } from '@/components/ui/LoadingState';
import type { DashboardSummary, ObligationProgress, DelayAlert, DeadlineAlert } from '@/services/dashboardService';
import { getCompetenceMonth } from '@/lib/utils';

const MONTH_NAMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const MONTH_ABBR  = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'];

/* ─── KPI Card ─── */
function KPICard({
  title, value, sub, color = 'var(--text-primary)', onClick,
}: { title: string; value: string | number; sub: string; color?: string; onClick?: () => void }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: 'var(--bg-card)', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', padding: '18px 20px',
        boxShadow: 'var(--shadow-sm)',
        flex: 1, minWidth: 160,
        transition: 'box-shadow var(--transition-fast)',
        cursor: onClick ? 'pointer' : 'default',
      }}
      onMouseEnter={(e) => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-md)'; }}
      onMouseLeave={(e) => { if (onClick) (e.currentTarget as HTMLDivElement).style.boxShadow = 'var(--shadow-sm)'; }}
    >
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>{title}</p>
      <p style={{ fontSize: 32, fontWeight: 800, color, lineHeight: 1, marginBottom: 6 }}>{value}</p>
      <p style={{ fontSize: 11, color: 'var(--text-placeholder)' }}>{sub}</p>
    </div>
  );
}

/* ─── Progress bar ─── */
function ProgressBar({ percent, width = 80 }: { percent: number; width?: number }) {
  const color = percent >= 80 ? 'var(--color-success)' : percent >= 50 ? 'var(--color-warning)' : 'var(--color-danger)';
  return (
    <div style={{ height: 6, background: 'var(--border-color)', borderRadius: 3, overflow: 'hidden', flexShrink: 0, width }}>
      <div style={{ height: '100%', width: `${percent}%`, background: color, borderRadius: 3, transition: 'width 0.4s ease' }} />
    </div>
  );
}

/* ─── Status mini badge ─── */
const S_COLORS: Record<string, { bg: string; color: string }> = {
  ok:  { bg: 'var(--status-ok-bg)',  color: 'var(--status-ok-text)'  },
  sm:  { bg: 'var(--status-sm-bg)',  color: 'var(--status-sm-text)'  },
  p:   { bg: 'var(--status-p-bg)',   color: 'var(--status-p-text)'   },
  sti: { bg: 'var(--status-sti-bg)', color: 'var(--status-sti-text)' },
  stc: { bg: 'var(--status-stc-bg)', color: 'var(--status-stc-text)' },
};
function SBadge({ label, count, variant }: { label: string; count: number; variant: string }) {
  if (count === 0) return null;
  const c = S_COLORS[variant] ?? { bg: 'var(--bg-hover)', color: 'var(--text-secondary)' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, background: c.bg, color: c.color, fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap' }}>
      {label} {count}
    </span>
  );
}

/* ─── Deadline alerts block ─── */
function DeadlineAlertsBlock({ alerts, year, month }: { alerts: DeadlineAlert[]; year: string; month: number }) {
  const router = useRouter();
  if (alerts.length === 0) return null;

  const periodStr = `${MONTH_NAMES[month - 1]}/${year}`;

  const SEV: Record<string, { border: string; bg: string; color: string; label: string }> = {
    expired:   { border: 'var(--color-danger)',  bg: 'var(--color-danger-soft)',  color: 'var(--color-danger)',  label: 'Vencido'  },
    urgent:    { border: 'var(--color-warning)', bg: 'var(--color-warning-soft)', color: 'var(--color-warning)', label: 'Urgente'  },
    attention: { border: 'var(--color-primary)', bg: 'var(--color-primary-soft)', color: 'var(--color-primary)', label: 'Atenção'  },
  };

  function dueDayText(alert: DeadlineAlert) {
    if (alert.daysUntilDue < 0) return `Prazo venceu há ${Math.abs(alert.daysUntilDue)} dia(s)`;
    if (alert.daysUntilDue === 0) return 'Vence hoje';
    return `${alert.daysUntilDue} dia(s) para o prazo`;
  }

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--color-danger)', borderRadius: 'var(--radius-md)', padding: '14px 18px', boxShadow: 'var(--shadow-sm)' }}>
      <p style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-danger)', marginBottom: 12 }}>
        ⚠ Alertas de prazo — {periodStr}
      </p>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        {alerts.map((alert) => {
          const sev = SEV[alert.severity];
          return (
            <div
              key={`${alert.obligationCode}-${alert.taxRegimeId ?? 'geral'}`}
              onClick={() => router.push(`/atividades?tipo=${alert.obligationCode}&ano=${year}&mes=${month}`)}
              style={{
                border: `1px solid ${sev.border}`, background: sev.bg, borderRadius: 'var(--radius-sm)',
                padding: '10px 14px', cursor: 'pointer', minWidth: 160, flex: '1 1 160px', maxWidth: 260,
                transition: 'opacity var(--transition-fast)',
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.8'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
            >
              <p style={{ fontSize: 13, fontWeight: 700, color: sev.color, marginBottom: 3 }}>
                {alert.obligationName}
                {alert.taxRegimeName && (
                  <span style={{ fontWeight: 400 }}> — {alert.taxRegimeName}</span>
                )}
              </p>
              <p style={{ fontSize: 11, color: sev.color, marginBottom: 4 }}>{dueDayText(alert)}</p>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>
                {alert.pendingCount} pendência{alert.pendingCount !== 1 ? 's' : ''} em aberto · dia {alert.dueDay}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ─── Progresso por área ─── */
function ProgressCard({ data, month, year }: { data: ObligationProgress[]; month: number; year: string }) {
  const router = useRouter();
  const period = `${MONTH_ABBR[month - 1]}/${year}`;

  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
          Progresso por área — <span style={{ color: 'var(--color-primary)' }}>{period}</span>
        </p>
      </div>
      {data.length === 0 ? (
        <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--text-placeholder)' }}>
          Nenhuma atividade elegível para o mês selecionado.
        </div>
      ) : (
        <div>
          {data.map((obl) => (
            <div
              key={obl.code}
              onClick={() => router.push(`/atividades?tipo=${obl.code}&ano=${year}&mes=${month}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
            >
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', minWidth: 120, flex: '0 0 120px' }}>{obl.name}</span>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', flex: 1 }}>
                <SBadge label="OK"   count={obl.okCount}  variant="ok"  />
                <SBadge label="S/M"  count={obl.smCount}  variant="sm"  />
                <SBadge label="P"    count={obl.pCount}   variant="p"   />
                <SBadge label="ST-I" count={obl.stiCount} variant="sti" />
                <SBadge label="ST-C" count={obl.stcCount} variant="stc" />
                <span style={{ fontSize: 10, color: 'var(--text-placeholder)', marginLeft: 2 }}>{obl.totalEligible} emp.</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <ProgressBar percent={obl.completionPercent} />
                <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', minWidth: 32, textAlign: 'right' }}>{obl.completionPercent}%</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Alertas de atraso ─── */
function AlertsCard({ data, year }: { data: DelayAlert[]; year: string }) {
  const router = useRouter();
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
      <div style={{ padding: '14px 18px 10px', borderBottom: '1px solid var(--border-color)' }}>
        <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>Alertas de atraso</p>
      </div>
      {data.length === 0 ? (
        <div style={{ padding: '24px 18px', textAlign: 'center', fontSize: 'var(--font-size-sm)', color: 'var(--color-success)' }}>
          Nenhum atraso em meses anteriores.
        </div>
      ) : (
        <div>
          {data.map((alert, i) => (
            <div
              key={i}
              onClick={() => router.push(`/atividades?tipo=${alert.code}&ano=${year}&mes=${alert.month}`)}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 18px', borderBottom: '1px solid var(--border-color)', flexWrap: 'wrap', cursor: 'pointer', transition: 'background var(--transition-fast)' }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = 'var(--bg-hover)'; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = ''; }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{alert.name}</p>
                <p style={{ fontSize: 10, color: 'var(--text-placeholder)', marginTop: 1 }}>{alert.monthLabel}</p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: 'var(--text-secondary)' }}>{alert.totalEligible} emp.</span>
                <span style={{ background: 'var(--status-p-bg)', color: 'var(--status-p-text)', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 4, whiteSpace: 'nowrap' }}>
                  {alert.pendingCount} pend.
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Annual bar chart (CSS only) ─── */
function AnnualChart({ data, year, currentMonth }: { data: DashboardSummary['annualCompletion']; year: string; currentMonth: number }) {
  const maxCount = Math.max(...data.map((d) => d.count), 1);
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-sm)', padding: '14px 18px 16px' }}>
      <p style={{ fontSize: 'var(--font-size-sm)', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
        Atividades concluídas — <span style={{ color: 'var(--color-primary)' }}>{year}</span>
      </p>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 100 }}>
        {data.map((d) => {
          const isCurrent = d.month === currentMonth;
          return (
            <div key={d.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, height: '100%', justifyContent: 'flex-end' }}>
              {d.count > 0 && (
                <span style={{ fontSize: 9, color: isCurrent ? 'var(--color-primary)' : 'var(--text-secondary)', lineHeight: 1, fontWeight: isCurrent ? 700 : 400 }}>{d.count}</span>
              )}
              <div style={{
                width: '100%',
                height: `${Math.max(d.count > 0 ? 6 : 2, Math.round((d.count / maxCount) * 75))}px`,
                background: isCurrent ? 'var(--color-primary)' : d.count > 0 ? 'var(--color-success)' : 'var(--border-color)',
                borderRadius: '3px 3px 0 0',
                opacity: d.count > 0 ? 0.85 : 0.35,
                transition: 'height 0.4s ease',
              }} />
            </div>
          );
        })}
      </div>
      <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
        {data.map((d) => (
          <div key={d.month} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: d.month === currentMonth ? 'var(--color-primary)' : 'var(--text-placeholder)', fontWeight: d.month === currentMonth ? 700 : 400 }}>{d.label}</div>
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--text-secondary)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-success)', display: 'inline-block' }} /> Concluídas (OK + S/M)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 10, color: 'var(--color-primary)' }}>
          <span style={{ width: 10, height: 10, borderRadius: 2, background: 'var(--color-primary)', display: 'inline-block' }} /> Mês selecionado
        </span>
      </div>
    </div>
  );
}

/* ─── Page ─── */
export default function DashboardPage() {
  const router = useRouter();
  const { accountingYears, activeYear } = useAppContext();
  const [month, setMonth] = useState(getCompetenceMonth());
  const [year,  setYear]  = useState(String(new Date().getFullYear()));

  const [data,    setData]    = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    if (activeYear) setYear(String(activeYear.year));
  }, [activeYear]);

  const load = useCallback(async (m: number, y: string) => {
    if (!y) return;
    const showInitialLoading = !hasLoadedRef.current;
    if (showInitialLoading) setLoading(true);
    setError(null);
    try {
      const res  = await fetch(`/api/dashboard?month=${m}&year=${y}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setData(json.data);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Erro ao carregar dashboard');
    } finally {
      hasLoadedRef.current = true;
      if (showInitialLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { if (year) load(month, year); }, [month, year, load]);

  /* ─── KPI colors ─── */
  const completionColor = !data ? 'var(--text-primary)'
    : data.completionPercent >= 80 ? 'var(--color-success)'
    : data.completionPercent >= 50 ? 'var(--color-warning)'
    : 'var(--color-danger)';

  const pendingColor = !data ? 'var(--text-primary)'
    : data.pendingCount === 0 ? 'var(--color-success)' : 'var(--color-danger)';

  const alertColor = !data ? 'var(--text-primary)'
    : data.delayAlertObligationCount === 0 ? 'var(--color-success)' : 'var(--color-warning)';

  const deadlineCount = useMemo(() => data?.deadlineAlerts?.length ?? 0, [data]);

  return (
    <div className="page-container print-page" style={{ paddingBottom: 40 }}>

      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Visão geral das atividades</p>
        </div>
        <div className="no-print" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select className="form-select" style={{ width: 140, height: 34, fontSize: 'var(--font-size-sm)' }}
            value={month} onChange={(e) => setMonth(Number(e.target.value))}>
            {MONTH_NAMES.map((n, i) => <option key={i + 1} value={i + 1}>{n}</option>)}
          </select>
          <select className="form-select" style={{ width: 90, height: 34, fontSize: 'var(--font-size-sm)' }}
            value={year} onChange={(e) => setYear(e.target.value)}>
            {accountingYears.length > 0
              ? accountingYears.map((y) => <option key={y.id} value={String(y.year)}>{y.year}</option>)
              : <option value={String(new Date().getFullYear())}>{new Date().getFullYear()}</option>
            }
          </select>
          <button
            onClick={() => window.print()}
            style={{ padding: '5px 12px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-color)', background: 'var(--bg-card)', color: 'var(--text-secondary)', fontSize: 'var(--font-size-sm)', cursor: 'pointer', fontFamily: 'var(--font-family)' }}
          >
            🖨 Imprimir
          </button>
        </div>
      </div>

      {/* Print-only header */}
      <div className="print-only" style={{ display: 'none', marginBottom: 12 }}>
        <p style={{ fontSize: 12, color: '#374151' }}>{MONTH_NAMES[month - 1]} / {year}</p>
      </div>

      {loading ? (
        <LoadingState message="Calculando indicadores..." />
      ) : error ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--color-danger)', background: 'var(--bg-card)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
          <p style={{ fontWeight: 600 }}>Erro ao carregar dashboard</p>
          <p style={{ fontSize: 'var(--font-size-sm)', marginTop: 4 }}>{error}</p>
        </div>
      ) : !data ? null : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

          {/* ── Deadline alerts (conditional) ── */}
          {(data.deadlineAlerts?.length ?? 0) > 0 && (
            <DeadlineAlertsBlock alerts={data.deadlineAlerts} year={year} month={month} />
          )}

          {/* ── KPIs ── */}
          <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
            <KPICard
              title="Empresas"
              value={data.activeCompanies}
              sub={`${data.activeGroups} grupo${data.activeGroups !== 1 ? 's' : ''}`}
              onClick={() => router.push('/empresas')}
            />
            <KPICard
              title="Concluído"
              value={`${data.completionPercent}%`}
              sub={`${MONTH_ABBR[month - 1]}/${year} · ${data.completedCount} de ${data.totalEligible}`}
              color={completionColor}
            />
            <KPICard
              title="Pendências"
              value={data.pendingCount}
              sub="itens com status P"
              color={pendingColor}
              onClick={() => router.push(`/atividades?ano=${year}&mes=${month}`)}
            />
            <KPICard
              title={`Alertas prazo ${deadlineCount > 0 ? `(${deadlineCount})` : ''}`}
              value={data.delayAlertObligationCount}
              sub="obrigações com pend. anteriores"
              color={alertColor}
            />
          </div>

          {/* ── Middle row ── */}
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
            <ProgressCard data={data.progressByObligation} month={month} year={year} />
            <AlertsCard data={data.delayedObligations} year={year} />
          </div>

          {/* ── Annual chart ── */}
          <AnnualChart data={data.annualCompletion} year={year} currentMonth={month} />

        </div>
      )}
    </div>
  );
}
