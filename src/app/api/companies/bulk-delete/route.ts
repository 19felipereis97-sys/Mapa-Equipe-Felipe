import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/companyService';
import { requirePermission } from '@/lib/authGuard';

export async function POST(req: NextRequest) {
  try {
    const guard = await requirePermission('clear_data');
    if (!guard.ok) return guard.response;

    const body = await req.json();
    const ids = Array.isArray(body?.ids)
      ? body.ids.map((id: unknown) => Number(id)).filter((id: number) => Number.isInteger(id))
      : [];
    if (ids.length === 0) {
      return NextResponse.json({ error: 'Nenhuma empresa selecionada', success: false }, { status: 400 });
    }
    await svc.deleteCompanies(ids);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao excluir empresas';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
