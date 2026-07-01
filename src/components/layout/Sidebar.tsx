'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '@/hooks/useSidebar';
import { useTheme } from '@/hooks/useTheme';
import { MENU_ITEMS } from '@/constants/menu';
import { NavIcon, IconChevronLeft, IconChevronRight, IconSun, IconMoon } from './Icons';
import { Tooltip } from '@/components/ui/Tooltip';

export function Sidebar() {
  const { isCollapsed, toggle } = useSidebar();
  const { theme, toggleTheme } = useTheme();
  const pathname = usePathname();

  return (
    <aside className={`sidebar${isCollapsed ? ' collapsed' : ''}`}>
      {/* Header */}
      <div className={`sidebar-header${isCollapsed ? ' sidebar-header-collapsed' : ''}`}>
        {!isCollapsed && (
          <span className="sidebar-logo-text sidebar-logo-brand">
            Mapa da Equipe
          </span>
        )}
        <button
          className="sidebar-toggle-btn"
          onClick={toggle}
          aria-label={isCollapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {isCollapsed ? <IconChevronRight size={16} /> : <IconChevronLeft size={16} />}
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
      </div>
    </aside>
  );
}
