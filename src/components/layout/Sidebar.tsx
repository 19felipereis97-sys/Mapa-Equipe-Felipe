'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useSidebar } from '@/hooks/useSidebar';
import { useMobileNav } from '@/hooks/useMobileNav';
import { useTheme } from '@/hooks/useTheme';
import { MENU_ITEMS } from '@/constants/menu';
import { NavIcon, IconChevronLeft, IconChevronRight, IconSun, IconMoon, IconX } from './Icons';
import { Tooltip } from '@/components/ui/Tooltip';

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const { isOpen: mobileOpen, close: closeMobileNav } = useMobileNav();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();
  const { data: session } = useSession();

  // Fecha a gaveta mobile automaticamente ao trocar de rota.
  useEffect(() => { closeMobileNav(); }, [pathname, closeMobileNav]);

  // Enquanto a gaveta mobile estiver aberta: Escape fecha, e o scroll do body
  // fica travado (senão o conteúdo por trás rola junto no iOS).
  useEffect(() => {
    if (!mobileOpen) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') closeMobileNav();
    }
    document.addEventListener('keydown', handleKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [mobileOpen, closeMobileNav]);

  return (
    <>
      {/* Overlay — só visível/clicável em mobile com a gaveta aberta (CSS cuida disso) */}
      <div
        className={`sidebar-overlay${mobileOpen ? ' visible' : ''}`}
        onClick={closeMobileNav}
        aria-hidden="true"
      />
      <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}>
      {/* Header */}
      <div className={`sidebar-header${isCollapsed ? ' sidebar-header-collapsed' : ''}`}>
        {/* Sempre renderizado — o CSS esconde em modo collapsed no desktop
            (.sidebar.collapsed .sidebar-logo-brand), mas a gaveta mobile
            nunca deve ficar sem o nome do app, mesmo que a preferência de
            collapse do desktop esteja salva como true. */}
        <span className="sidebar-logo-text sidebar-logo-brand">
          Mapa da Equipe
        </span>
        <button
          className="sidebar-toggle-btn"
          onClick={toggle}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
        </button>
        <button
          className="sidebar-close-btn"
          onClick={closeMobileNav}
          aria-label="Fechar menu"
        >
          <IconX size={18} />
        </button>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" aria-label="Menu principal">
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          const linkEl = (
            <Link
              key={item.href}
              href={item.href}
              className={`sidebar-nav-item${isActive ? ' active' : ''}`}
              aria-current={isActive ? 'page' : undefined}
            >
              <span className="sidebar-nav-icon">
                <NavIcon name={item.iconName} size={18} />
              </span>
              <span className="sidebar-nav-label">{item.label}</span>
            </Link>
          );

          if (isCollapsed) {
            return (
              <Tooltip key={item.href} content={item.label} position="right">
                {linkEl}
              </Tooltip>
            );
          }
          return linkEl;
        })}
      </nav>

      {/* Footer — theme toggle */}
      <div className="sidebar-footer">
        {isCollapsed ? (
          <Tooltip content={theme === 'light' ? 'Tema escuro' : 'Tema claro'} position="right">
            <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Alternar tema">
              <span className="sidebar-nav-icon">
                {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
              </span>
            </button>
          </Tooltip>
        ) : (
          <button className="theme-toggle-btn" onClick={toggleTheme} aria-label="Alternar tema">
            <span className="sidebar-nav-icon">
              {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
            </span>
            <span className="sidebar-nav-label">
              {theme === 'light' ? 'Tema escuro' : 'Tema claro'}
            </span>
          </button>
        )}

        {/* Minha conta */}
        {session?.user && (
          isCollapsed ? (
            <Tooltip content={`Minha conta (${session.user.name ?? ''})`} position="right">
              <Link href="/conta" className="theme-toggle-btn" aria-label="Minha conta">
                <span className="sidebar-nav-icon" aria-hidden>👤</span>
              </Link>
            </Tooltip>
          ) : (
            <Link href="/conta" className="theme-toggle-btn" title="Minha conta" style={{ textDecoration: 'none' }}>
              <span className="sidebar-nav-icon" aria-hidden>👤</span>
              <span className="sidebar-nav-label" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', lineHeight: 1.2 }}>
                <span>{session.user.name}</span>
                <span style={{ fontSize: 11, opacity: 0.7 }}>{(session.user as { role?: string }).role}</span>
              </span>
            </Link>
          )
        )}

        {/* Sair */}
        {session?.user && (
          isCollapsed ? (
            <Tooltip content="Sair" position="right">
              <button className="theme-toggle-btn" onClick={() => signOut({ callbackUrl: '/login' })} aria-label="Sair">
                <span className="sidebar-nav-icon" aria-hidden>⎋</span>
              </button>
            </Tooltip>
          ) : (
            <button className="theme-toggle-btn" onClick={() => signOut({ callbackUrl: '/login' })} aria-label="Sair" title="Sair">
              <span className="sidebar-nav-icon" aria-hidden>⎋</span>
              <span className="sidebar-nav-label">Sair</span>
            </button>
          )
        )}
      </div>
      </aside>
    </>
  );
}
