import { NextResponse } from 'next/server';
import * as svc from '@/services/obligationService';

export async function GET() {
  try {
    const data = await svc.getObligations();
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar obrigações', success: false }, { status: 500 });
  }
}
