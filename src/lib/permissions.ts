/* ─────────────────────────────────────────────────────────────────────────────
   RBAC — papéis e permissões.
   Edge-safe (sem Prisma/Node APIs): pode ser importado no middleware.
──────────────────────────────────────────────────────────────────────────── */

export type Role = 'ADMIN' | 'GESTOR' | 'OPERADOR' | 'LEITURA';

export type Permission =
  | 'import'          // importar arquivos (G-Click, empresas, portais)
  | 'clear_data'      // excluir/limpar dados em massa
  | 'reports'         // gerar relatórios (PDF/Excel)
  | 'edit_status'     // alterar status de atividades
  | 'reprocess'       // reprocessar indicadores/tarefas
  | 'view_logs'       // acessar logs de processamento
  | 'manage_users'    // gerenciar usuários
  | 'view_dashboard'; // visualizar dashboard e telas

const ALL: Permission[] = [
  'import', 'clear_data', 'reports', 'edit_status',
  'reprocess', 'view_logs', 'manage_users', 'view_dashboard',
];

const MATRIX: Record<Role, Permission[]> = {
  ADMIN: ALL,
  GESTOR: ['import', 'clear_data', 'reports', 'edit_status', 'reprocess', 'view_logs', 'view_dashboard'],
  OPERADOR: ['import', 'reports', 'edit_status', 'view_dashboard'],
  LEITURA: ['view_dashboard'],
};

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false;
  return MATRIX[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: Role | null | undefined): Permission[] {
  if (!role) return [];
  return MATRIX[role] ?? [];
}
