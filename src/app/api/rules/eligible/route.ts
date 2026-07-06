import { NextRequest, NextResponse } from 'next/server';
import { getEligibleCompaniesCached } from '@/services/obligationRulesService';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const obligationCode     = searchParams.get('obligation') ?? '';
    const yearParam          = searchParams.get('year');
    const year               = yearParam ? parseInt(yearParam, 10) : new Date().getFullYear();
    const includeTerminated  = searchParams.get('includeTerminated') === 'true';
    const onlyTerminated     = searchParams.get('onlyTerminated') === 'true';

    if (!obligationCode) {
      return NextResponse.json({ error: 'Parâmetro "obligation" é obrigatório', success: false }, { status: 400 });
    }
    if (isNaN(year) || year < 2000 || year > 2100) {
      return NextResponse.json({ error: 'Ano inválido', success: false }, { status: 400 });
    }

    const data = await getEligibleCompaniesCached({
      obligationCode,
      year,
      includeTerminated,
      onlyTerminated,
    });

    return NextResponse.json({ data, success: true });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro no motor de regras';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
