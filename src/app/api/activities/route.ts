import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/activityStatusService';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const obligationCode = url.searchParams.get('obligationCode');
    const companyId      = url.searchParams.get('companyId');
    const year           = url.searchParams.get('year');

    if (companyId && year) {
      const data = await svc.listStatusesByCompanyAndYear(Number(companyId), parseInt(year));
      return NextResponse.json({ data, success: true });
    }

    if (!obligationCode || !year) {
      return NextResponse.json({ error: 'obligationCode e year são obrigatórios', success: false }, { status: 400 });
    }
    const data = await svc.listStatusesByObligationAndYear(obligationCode, parseInt(year));
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar status';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, obligationCode, year, month, status, observation, responsibleId } = body;
    if (!companyId || !obligationCode || year == null || month == null || !status) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes', success: false }, { status: 400 });
    }
    if ((status === 'P' || status === 'ST-I' || status === 'ABERTO') && !observation?.trim()) {
      return NextResponse.json({ error: 'Observação é obrigatória para os status P, ST-I e ABERTO', success: false }, { status: 400 });
    }
    const data = await svc.upsertActivityStatus({
      companyId: Number(companyId),
      obligationCode,
      year: Number(year),
      month: Number(month),
      status,
      observation: observation ?? null,
      responsibleId: responsibleId ? Number(responsibleId) : null,
    });
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao salvar status';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { companyId, obligationCode, year, month } = body;
    if (!companyId || !obligationCode || year == null || month == null) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes', success: false }, { status: 400 });
    }
    await svc.clearActivityStatus(Number(companyId), obligationCode, Number(year), Number(month));
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao limpar status';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
