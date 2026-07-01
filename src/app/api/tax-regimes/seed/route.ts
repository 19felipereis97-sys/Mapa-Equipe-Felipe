import { NextResponse } from 'next/server';
import { seedBrazilianTaxRegimes } from '@/services/taxRegimeService';

export async function POST() {
  try {
    const created = await seedBrazilianTaxRegimes();
    return NextResponse.json({ data: created, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao preencher tributações';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
