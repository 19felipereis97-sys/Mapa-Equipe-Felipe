import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/userService';
import { requirePermission } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

export async function GET() {
  const guard = await requirePermission('manage_users');
  if (!guard.ok) return guard.response;
  try {
    const data = await svc.listUsers();
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao listar usuários', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const guard = await requirePermission('manage_users');
  if (!guard.ok) return guard.response;
  try {
    const body = await req.json();
    const data = await svc.createUser(body);
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao criar usuário', success: false }, { status: 400 });
  }
}
