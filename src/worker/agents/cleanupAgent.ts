import type { TaskHandler } from '@/worker/registry';
import prisma from '@/lib/prisma';

/* CleanupAgent — remove dados descartáveis:
   - tarefas concluídas/canceladas/erro com mais de RETENTION_DAYS
   - logs de processamento antigos
   - relatórios gerados expirados (expiresAt no passado)
   Concorrência 1. Agendado periodicamente pelo worker. */
const RETENTION_DAYS = 30;

export const cleanupAgent: TaskHandler = async () => {
  const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000);

  const oldLogs = await prisma.logProcessamento.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const oldErros = await prisma.erroProcessamento.deleteMany({ where: { createdAt: { lt: cutoff } } });
  const expiredReports = await prisma.relatorioGerado.deleteMany({ where: { expiresAt: { not: null, lt: new Date() } } });
  const oldTasks = await prisma.tarefaProcessamento.deleteMany({
    where: {
      status: { in: ['CONCLUIDO', 'CONCLUIDO_COM_ALERTAS', 'CANCELADO', 'ERRO'] },
      finishedAt: { lt: cutoff },
    },
  });

  const registros = oldLogs.count + oldErros.count + expiredReports.count + oldTasks.count;
  return {
    registros,
    mensagemUsuario: `Limpeza: ${oldTasks.count} tarefas, ${oldLogs.count} logs, ${expiredReports.count} relatórios expirados`,
  };
};
