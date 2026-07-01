import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/taxRegimeService';

export async function GET() {
  try {
    const data = await svc.getTaxRegimes();
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar tributações', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório', success: false }, { status: 400 });
    }
    const data = await svc.createTaxRegime(body.name, body.color ?? null);
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar tributação';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
