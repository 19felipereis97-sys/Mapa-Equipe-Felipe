export const ROUTES = {
  HOME: '/',
  DASHBOARD: '/dashboard',
  EMPRESAS: '/empresas',
  ATIVIDADES: '/atividades',
  LEMBRETES: '/lembretes',
  ANOTACOES: '/anotacoes',
  EQUIPE: '/equipe',
  METAS_DIA: '/metas-dia',
  RESCINDIDAS: '/rescindidas',
  PORTAIS_ELETRONICOS: '/portais-eletronicos',
  TAREFAS_GCLICK: '/tarefas-gclick',
  CONFIGURACOES: '/configuracoes',
} as const;

export type AppRoute = (typeof ROUTES)[keyof typeof ROUTES];
