import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/companyService';

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await svc.duplicateCompany(parseInt(params.id));
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao duplicar empresa';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
