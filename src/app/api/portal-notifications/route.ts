import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/portalNotificationService';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const completed = url.searchParams.get('completed') === 'true';
    const data = await svc.listNotifications(completed);

    // Sort by urgency priority (high → medium → normal) then date
    const order: Record<string, number> = { high: 0, medium: 1, normal: 2 };
    data.sort((a, b) => {
      const u = (order[a.urgency] ?? 2) - (order[b.urgency] ?? 2);
      if (u !== 0) return u;
      return a.notificationDate.localeCompare(b.notificationDate);
    });

    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao listar notificações';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const result = await svc.clearHistory();
    return NextResponse.json({ data: { deleted: result.count }, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao limpar histórico';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
