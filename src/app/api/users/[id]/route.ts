import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/userService';
import { requirePermission } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('manage_users');
  if (!guard.ok) return guard.response;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'id inválido', success: false }, { status: 400 });
  try {
    const body = await req.json();
    const data = await svc.updateUser(id, body);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao atualizar usuário', success: false }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const guard = await requirePermission('manage_users');
  if (!guard.ok) return guard.response;
  const id = Number(params.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: 'id inválido', success: false }, { status: 400 });
  // Evita o admin se autoexcluir por engano.
  if (String(id) === guard.session.user.id) {
    return NextResponse.json({ error: 'Você não pode excluir a si mesmo', success: false }, { status: 400 });
  }
  try {
    await svc.deleteUser(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao excluir usuário', success: false }, { status: 400 });
  }
}
