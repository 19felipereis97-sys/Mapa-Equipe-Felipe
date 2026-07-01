import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/companyService';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const data = await svc.listCompanies({
      includeTerminated: sp.get('includeTerminated') === 'true',
      onlyTerminated: sp.get('onlyTerminated') === 'true',
    });
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar empresas', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.corporateName?.trim()) {
      return NextResponse.json({ error: 'Razão social é obrigatória', success: false }, { status: 400 });
    }
    if (body.document) {
      const d = body.document.replace(/\D/g, '');
      if (d.length !== 11 && d.length !== 14) {
        return NextResponse.json({ error: 'CPF deve ter 11 dígitos e CNPJ 14 dígitos', success: false }, { status: 400 });
      }
    }
    const data = await svc.createCompany(body);
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar empresa';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
