import { ROUTES } from './routes';

export interface MenuItem {
  label: string;
  href: string;
  iconName: string;
}

export const MENU_ITEMS: MenuItem[] = [
  { label: 'Dashboard',     href: ROUTES.DASHBOARD,    iconName: 'dashboard' },
  { label: 'Empresas',      href: ROUTES.EMPRESAS,     iconName: 'building' },
  { label: 'Atividades',    href: ROUTES.ATIVIDADES,   iconName: 'activity' },
  { label: 'Lembretes',     href: ROUTES.LEMBRETES,    iconName: 'bell' },
  { label: 'Anotações',    href: ROUTES.ANOTACOES,    iconName: 'note' },
  { label: 'Equipe',        href: ROUTES.EQUIPE,       iconName: 'users' },
  { label: 'Metas do Dia',  href: ROUTES.METAS_DIA,    iconName: 'target' },
  { label: 'Portais Eletrônicos', href: ROUTES.PORTAIS_ELETRONICOS, iconName: 'portal' },
  { label: 'Rescindidas',   href: ROUTES.RESCINDIDAS,  iconName: 'archive' },
  { label: 'Configurações', href: ROUTES.CONFIGURACOES, iconName: 'settings' },
];
