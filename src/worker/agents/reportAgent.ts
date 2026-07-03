import type { TaskHandler } from '@/worker/registry';
import prisma from '@/lib/prisma';
import { getStorage } from '@/lib/storage';
import { exportObligationToBuffer, exportAllObligationsToBuffer } from '@/services/excelExportService';

/* ReportAgent — gera relatórios pesados em background, grava o arquivo no
   storage e registra em relatorios_gerados. O request do usuário só cria a
   tarefa; o download é feito depois, quando a tarefa conclui.

   Params esperados:
   { kind: 'excel_single' | 'excel_complete', year, obligation?, onlyTerminated? } */

interface ReportParams {
  kind?: 'excel_single' | 'excel_complete';
  year?: number;
  obligation?: string;
  onlyTerminated?: boolean;
}

const REPORT_TTL_MS = 24 * 60 * 60 * 1000; // relatórios expiram em 24h

export const reportAgent: TaskHandler = async (task) => {
  const p = (task.params ?? {}) as ReportParams;
  const year = Number(p.year);
  const onlyTerminated = !!p.onlyTerminated;
  if (!year) throw new Error('REPORT: params.year ausente');

  const contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  let buffer: ArrayBuffer;
  let filename: string;

  if (p.kind === 'excel_complete') {
    ({ buffer, filename } = await exportAllObligationsToBuffer({ year, onlyTerminated }));
  } else if (p.kind === 'excel_single') {
    if (!p.obligation) throw new Error('REPORT: params.obligation ausente para excel_single');
    ({ buffer, filename } = await exportObligationToBuffer({ obligationCode: p.obligation, year, onlyTerminated }));
  } else {
    throw new Error(`REPORT: kind inválido (${p.kind})`);
  }

  const data = Buffer.from(buffer);
  const storagePath = `reports/${year}/${task.id}_${filename}`;
  await getStorage().put(storagePath, data, contentType);

  const relatorio = await prisma.relatorioGerado.create({
    data: {
      tipo: p.kind ?? 'excel',
      filtros: { year, obligation: p.obligation ?? null, onlyTerminated },
      storagePath,
      status: 'CONCLUIDO',
      userId: task.userId ?? null,
      expiresAt: new Date(Date.now() + REPORT_TTL_MS),
    },
  });

  return {
    registros: data.length,
    resultRef: String(relatorio.id),
    mensagemUsuario: `Relatório pronto: ${filename}`,
  };
};
