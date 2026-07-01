import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/deadlineService';

export async function GET() {
  try {
    const data = await svc.getDeadlines();
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar prazos', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.obligationId) {
      return NextResponse.json({ error: 'Obrigação é obrigatória', success: false }, { status: 400 });
    }
    if (!body.dueDay) {
      return NextResponse.json({ error: 'Prazo final é obrigatório', success: false }, { status: 400 });
    }
    const dueDay = Number(body.dueDay);
    const startDay = body.startDay ? Number(body.startDay) : null;
    if (dueDay < 1 || dueDay > 31) {
      return NextResponse.json({ error: 'Prazo final deve ser entre 1 e 31', success: false }, { status: 400 });
    }
    if (startDay !== null && (startDay < 1 || startDay > 31)) {
      return NextResponse.json({ error: 'Início deve ser entre 1 e 31', success: false }, { status: 400 });
    }
    const data = await svc.createDeadline({
      obligationId: Number(body.obligationId),
      taxRegimeId: body.taxRegimeId ? Number(body.taxRegimeId) : null,
      startDay,
      dueDay,
    });
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar prazo';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
