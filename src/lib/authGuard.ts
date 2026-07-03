import { NextResponse } from 'next/server';
import { auth } from '@/auth';
import { can, type Permission, type Role } from '@/lib/permissions';

/* ─────────────────────────────────────────────────────────────────────────────
   Guard para route handlers. O middleware já bloqueia acesso não autenticado a
   todas as rotas; este guard adiciona a camada FINA de RBAC por permissão e é
   usado nas rotas críticas (import, limpeza, relatórios, bulk, logs).

   Uso:
     const guard = await requirePermission('import');
     if (!guard.ok) return guard.response;
     // guard.session disponível daqui em diante
──────────────────────────────────────────────────────────────────────────── */

interface Session {
  user: { id: string; name?: string | null; email?: string | null; role: Role };
}

type GuardResult =
  | { ok: true; session: Session }
  | { ok: false; response: NextResponse };

export async function requirePermission(permission: Permission): Promise<GuardResult> {
  const session = (await auth()) as Session | null;

  if (!session?.user) {
    return { ok: false, response: NextResponse.json({ error: 'Não autenticado', success: false }, { status: 401 }) };
  }
  if (!can(session.user.role, permission)) {
    return { ok: false, response: NextResponse.json({ error: 'Sem permissão para esta ação', success: false }, { status: 403 }) };
  }
  return { ok: true, session };
}

export async function getSession(): Promise<Session | null> {
  return (await auth()) as Session | null;
}
