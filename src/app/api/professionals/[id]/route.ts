import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/professionalService';

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    const body = await req.json();
    if (body.name !== undefined && !body.name.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório', success: false }, { status: 400 });
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return NextResponse.json({ error: 'E-mail inválido', success: false }, { status: 400 });
    }
    const data = await svc.updateProfessional(id, {
      name: body.name,
      teamId: body.teamId !== undefined ? (body.teamId ? Number(body.teamId) : null) : undefined,
      email: body.email !== undefined ? body.email : undefined,
      active: body.active,
    });
    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao atualizar profissional';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const id = parseInt(params.id);
    await svc.deleteProfessional(id);
    return NextResponse.json({ success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao excluir profissional';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
