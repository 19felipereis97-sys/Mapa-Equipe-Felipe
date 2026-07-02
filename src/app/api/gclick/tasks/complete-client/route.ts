import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/gclickService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.subject || !body.clientName) {
      return NextResponse.json({ error: 'Assunto e cliente são obrigatórios', success: false }, { status: 400 });
    }
    const count = await svc.completeClient(body.subject, body.clientCode ?? null, body.clientName);
    return NextResponse.json({ data: { count }, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao concluir cliente';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
