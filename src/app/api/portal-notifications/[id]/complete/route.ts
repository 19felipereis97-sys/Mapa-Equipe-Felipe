import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import * as svc from '@/services/portalNotificationService';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const current = await prisma.portalNotification.findUnique({ where: { id }, select: { completed: true } });
    if (!current) return NextResponse.json({ error: 'Notificação não encontrada', success: false }, { status: 404 });

    const data = current.completed
      ? await svc.reopenNotification(id)
      : await svc.completeNotification(id);

    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao atualizar status';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
