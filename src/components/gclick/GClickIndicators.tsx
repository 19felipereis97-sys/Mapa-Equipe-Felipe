'use client';

import React from 'react';

interface IndicatorProps {
  label: string;
  value: number;
  color?: string;
}

function Indicator({ label, value, color }: IndicatorProps) {
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border-color)',
      borderRadius: 'var(--radius-md)', padding: '14px 16px', boxShadow: 'var(--shadow-sm)',
      flex: '1 1 130px', minWidth: 120,
    }}>
      <p style={{ fontSize: 22, fontWeight: 800, color: color ?? 'var(--text-primary)', lineHeight: 1 }}>{value}</p>
      <p style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
        {label}
      </p>
    </div>
  );
}

export interface GClickIndicatorsData {
  subjects: number;
  clients: number;
  competences: number;
  tasks: number;
  overdue: number;
  dueToday: number;
  dueThisWeek: number;
  subjectsCompleted: number;
}

export function GClickIndicators({ data }: { data: GClickIndicatorsData }) {
  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 18 }}>
      <Indicator label="Assuntos" value={data.subjects} />
      <Indicator label="Clientes" value={data.clients} />
      <Indicator label="Competências" value={data.competences} />
      <Indicator label="Tarefas" value={data.tasks} />
      <Indicator label="Vencidas" value={data.overdue} color="var(--gclick-overdue-text)" />
      <Indicator label="Para hoje" value={data.dueToday} color="var(--gclick-today-text)" />
      <Indicator label="Nesta semana" value={data.dueThisWeek} color="var(--gclick-soon-text)" />
      <Indicator label="Assuntos concluídos" value={data.subjectsCompleted} color="var(--gclick-ok-text)" />
    </div>
  );
}
