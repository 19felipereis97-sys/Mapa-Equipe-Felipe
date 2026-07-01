import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/closingNoteService';

export async function GET(req: NextRequest) {
  try {
    const sp = req.nextUrl.searchParams;
    const data = await svc.listClosingNotes({
      search: sp.get('search'),
      companyId: sp.get('companyId') ? Number(sp.get('companyId')) : null,
      showArchived: sp.get('showArchived') === 'true',
    });
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar anotações', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const data = await svc.createClosingNote(await req.json());
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Erro ao criar anotação', success: false }, { status: 400 });
  }
}
