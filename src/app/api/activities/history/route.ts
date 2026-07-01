import { NextRequest, NextResponse } from 'next/server';
import { listHistoryByCompany } from '@/services/activityHistoryService';

export async function GET(req: NextRequest) {
  try {
    const url   = new URL(req.url);
    const sp    = url.searchParams;

    const companyId = sp.get('companyId');
    if (!companyId) {
      return NextResponse.json({ error: 'companyId é obrigatório', success: false }, { status: 400 });
    }

    const filters = {
      obligationId:  sp.get('obligationId')  ? Number(sp.get('obligationId'))  : undefined,
      year:          sp.get('year')           ? Number(sp.get('year'))           : undefined,
      month:         sp.get('month')          !== null ? Number(sp.get('month'))  : undefined,
      responsibleId: sp.get('responsibleId') ? Number(sp.get('responsibleId')) : undefined,
      newStatus:     sp.get('newStatus')     ?? undefined,
      dateStart:     sp.get('dateStart')     ?? undefined,
      dateEnd:       sp.get('dateEnd')       ?? undefined,
      limit:         sp.get('limit')         ? Number(sp.get('limit'))          : 50,
      offset:        sp.get('offset')        ? Number(sp.get('offset'))         : 0,
    };

    const data = await listHistoryByCompany(Number(companyId), filters);
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao buscar histórico';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
