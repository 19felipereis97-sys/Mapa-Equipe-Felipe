import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/reminderService';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const view = sp.get('view');
    const data = await svc.listReminders({
      search: sp.get('search'),
      companyId: sp.get('companyId') ? Number(sp.get('companyId')) : null,
      view: view === 'completed' || view === 'all' ? view : 'open',
    });
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar lembretes', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await svc.createReminder(await req.json());
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao criar lembrete', success: false }, { status: 400 });
  }
}
