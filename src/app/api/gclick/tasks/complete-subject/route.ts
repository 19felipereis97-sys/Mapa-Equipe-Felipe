import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/gclickService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.subject) {
      return NextResponse.json({ error: 'Assunto é obrigatório', success: false }, { status: 400 });
    }
    const count = await svc.completeSubject(body.subject);
    return NextResponse.json({ data: { count }, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao concluir assunto';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
