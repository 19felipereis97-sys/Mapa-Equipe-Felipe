import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/portalNotificationService';

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await svc.deleteNotification(parseInt(params.id));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao excluir notificação';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
