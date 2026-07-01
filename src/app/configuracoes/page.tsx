'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/ui/PageHeader';
import { TabProfissionais } from '@/components/configuracoes/TabProfissionais';
import { TabEquipes } from '@/components/configuracoes/TabEquipes';
import { TabTributacoes } from '@/components/configuracoes/TabTributacoes';
import { TabNiveis } from '@/components/configuracoes/TabNiveis';
import { TabPrazos } from '@/components/configuracoes/TabPrazos';
import { TabAnoContabil } from '@/components/configuracoes/TabAnoContabil';

const TABS = [
  { id: 'profissionais', label: 'Profissionais' },
  { id: 'equipes',       label: 'Equipes' },
  { id: 'tributacoes',   label: 'Tributações' },
  { id: 'niveis',        label: 'Níveis' },
  { id: 'prazos',        label: 'Prazos' },
  { id: 'ano-contabil',  label: 'Ano Contábil' },
] as const;

type TabId = typeof TABS[number]['id'];

export default function ConfiguracoesPage() {
  const [active, setActive] = useState<TabId>('profissionais');

  return (
    <div className="page-container">
      <PageHeader
        title="Configurações"
        subtitle="Dados de referência e parametrizações do sistema"
      />
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button${active === tab.id ? ' active' : ''}`}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className="tab-content">
        <div style={{ display: active === 'profissionais' ? 'block' : 'none' }}><TabProfissionais /></div>
        <div style={{ display: active === 'equipes' ? 'block' : 'none' }}><TabEquipes /></div>
        <div style={{ display: active === 'tributacoes' ? 'block' : 'none' }}><TabTributacoes /></div>
        <div style={{ display: active === 'niveis' ? 'block' : 'none' }}><TabNiveis /></div>
        <div style={{ display: active === 'prazos' ? 'block' : 'none' }}><TabPrazos /></div>
        <div style={{ display: active === 'ano-contabil' ? 'block' : 'none' }}><TabAnoContabil /></div>
      </div>
    </div>
  );
}
