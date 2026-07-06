import { NextRequest, NextResponse } from 'next/server';
import { changeOwnPassword } from '@/services/userService';
import { getSession } from '@/lib/authGuard';

export const dynamic = 'force-dynamic';

/* POST /api/account/password — usuário logado troca a própria senha. */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: 'Não autenticado', success: false }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await req.json();
    await changeOwnPassword(Number(session.user.id), currentPassword, newPassword);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao trocar senha', success: false }, { status: 400 });
  }
}
