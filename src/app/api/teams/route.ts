import { NextRequest, NextResponse } from 'next/server';
import * as teamService from '@/services/teamService';

export async function GET() {
  try {
    const data = await teamService.getTeams();
    return NextResponse.json({ data, success: true });
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar equipes', success: false }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório', success: false }, { status: 400 });
    }
    const data = await teamService.createTeam(body.name);
    return NextResponse.json({ data, success: true }, { status: 201 });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar equipe';
    return NextResponse.json({ error: msg, success: false }, { status: 400 });
  }
}
