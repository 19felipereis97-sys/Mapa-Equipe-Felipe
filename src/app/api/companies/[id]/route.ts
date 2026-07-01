import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/companyService';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await svc.getCompanyById(parseInt(params.id));
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Empresa não encontrada', success: false }, { status: 404 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    await svc.deleteCompany(parseInt(params.id));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao excluir empresa';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    if (body.corporateName !== undefined && !body.corporateName?.trim()) {
      return NextResponse.json({ error: 'Razão social é obrigatória', success: false }, { status: 400 });
    }
    if (body.document) {
      const d = body.document.replace(/\D/g, '');
      if (d.length !== 11 && d.length !== 14) {
        return NextResponse.json({ error: 'CPF deve ter 11 dígitos e CNPJ 14 dígitos', success: false }, { status: 400 });
      }
    }
    const data = await svc.updateCompany(id, body);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao atualizar empresa';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
