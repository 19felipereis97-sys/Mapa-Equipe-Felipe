import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/activityStatusService';

/* POST /api/activities/bulk — upsert multiple statuses */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body as {
      items: Array<{
        companyId: number;
        obligationCode: string;
        year: number;
        month: number;
        status: string;
        observation: string | null;
        responsibleId?: number | null;
      }>;
    };
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items deve ser um array não vazio', success: false }, { status: 400 });
    }
    const result = await svc.bulkUpsertActivityStatus(items);
    return NextResponse.json({ data: result, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro na operação em lote';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}

/* DELETE /api/activities/bulk — clear multiple statuses */
export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json();
    const { items } = body as {
      items: Array<{
        companyId: number;
        obligationCode: string;
        year: number;
        month: number;
      }>;
    };
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'items deve ser um array não vazio', success: false }, { status: 400 });
    }
    const result = await svc.bulkClearActivityStatus(items);
    return NextResponse.json({ data: result, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao limpar status em lote';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
