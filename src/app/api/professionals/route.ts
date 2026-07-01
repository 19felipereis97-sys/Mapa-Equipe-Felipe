import { NextRequest, NextResponse } from 'next/server';
import * as svc from '@/services/professionalService';

export async function GET() {
  try {
    const data = await svc.getProfessionals();
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar profissionais', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório', success: false }, { status: 400 });
    }
    if (body.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email.trim())) {
      return NextResponse.json({ error: 'E-mail inválido', success: false }, { status: 400 });
    }
    const data = await svc.createProfessional({
      name: body.name,
      teamId: body.teamId ? Number(body.teamId) : null,
      email: body.email || null,
    });
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar profissional';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
