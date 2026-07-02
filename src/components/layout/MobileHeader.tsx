'use client';

import React from 'react';
import { useMobileNav } from '@/hooks/useMobileNav';
import { IconMenu } from './Icons';

// Visível só abaixo de 640px (via CSS, ver .mobile-header em globals.css) — em
// desktop este componente monta mas fica com display:none, sem efeito visual.
export function MobileHeader() {
  const { isOpen, toggle } = useMobileNav();

  return (
    <header className="mobile-header">
      <button
        className="mobile-header-menu-btn"
        onClick={toggle}
        aria-label={isOpen ? 'Fechar menu' : 'Abrir menu'}
        aria-expanded={isOpen}
      >
        <IconMenu size={22} />
      </button>
      <span className="mobile-header-title">Mapa da Equipe</span>
    </header>
  );
}
