import { NextRequest, NextResponse } from 'next/server';
import { parseGClickWorkbook } from '@/lib/gclickParser';
import { importGClickTasks } from '@/services/gclickService';
import { requirePermission } from '@/lib/authGuard';

export async function POST(req: NextRequest) {
  try {
    const guard = await requirePermission('import');
    if (!guard.ok) return guard.response;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado', success: false }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const parsed = await parseGClickWorkbook(buffer);

    if (parsed.missingColumns.length > 0) {
      const found = parsed.detectedHeaders.length > 0
        ? ` Cabeçalhos encontrados na planilha: ${parsed.detectedHeaders.join(', ')}.`
        : '';
      return NextResponse.json({
        error: `Colunas obrigatórias ausentes na planilha: ${parsed.missingColumns.join(', ')}.${found}`,
        success: false,
      }, { status: 400 });
    }

    if (parsed.rows.length === 0) {
      return NextResponse.json({ error: 'Nenhuma tarefa válida encontrada na planilha', success: false }, { status: 400 });
    }

    const { created, updated } = await importGClickTasks(parsed.rows);

    return NextResponse.json({
      data: {
        created,
        updated,
        totalDataRows: parsed.totalDataRows,
        skippedEmptyRows: parsed.skippedEmptyRows,
      },
      success: true,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Erro ao processar planilha';
    return NextResponse.json({ error: msg, success: false }, { status: 500 });
  }
}
