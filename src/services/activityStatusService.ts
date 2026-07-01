import prisma from '@/lib/prisma';

/* ─── Obligation code → ID resolution ─── */
async function resolveObligationId(code: string): Promise<number> {
  const obl = await prisma.obligation.findUnique({ where: { code } });
  if (!obl) throw new Error(`Obrigação '${code}' não encontrada. Verifique se as obrigações estão cadastradas em Configurações.`);
  return obl.id;
}

/* ─── List all statuses for a company + year (used for rescission validation) ─── */
export async function listStatusesByCompanyAndYear(companyId: number, year: number) {
  return prisma.activityStatus.findMany({
    where: { companyId, year, month: { gte: 1, lte: 12 } },
    include: { obligation: { select: { code: true, name: true } } },
    orderBy: { month: 'asc' },
  });
}

/* ─── List statuses for obligation + year ─── */
export async function listStatusesByObligationAndYear(
  obligationCode: string,
  year: number,
) {
  const obligationId = await resolveObligationId(obligationCode);
  return prisma.activityStatus.findMany({
    where: { obligationId, year },
    orderBy: [{ companyId: 'asc' }, { month: 'asc' }],
  });
}

/* ─── Get single status ─── */
export async function getActivityStatus(
  companyId: number,
  obligationCode: string,
  year: number,
  month: number,
) {
  const obligationId = await resolveObligationId(obligationCode);
  return prisma.activityStatus.findUnique({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
  });
}

/* ─── Upsert with history ─── */
export async function upsertActivityStatus(data: {
  companyId: number;
  obligationCode: string;
  year: number;
  month: number;
  status: string;
  observation: string | null;
  responsibleId?: number | null;
}) {
  const { companyId, obligationCode, year, month, status, observation, responsibleId = null } = data;
  const obligationId = await resolveObligationId(obligationCode);

  // Get existing to compare
  const existing = await prisma.activityStatus.findUnique({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
  });

  const result = await prisma.activityStatus.upsert({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
    create: { companyId, obligationId, year, month, status, observation, responsibleId },
    update: { status, observation, responsibleId },
  });

  // Write history only when status actually changes
  if (!existing || existing.status !== status) {
    await prisma.activityStatusHistory.create({
      data: {
        companyId,
        obligationId,
        year,
        month,
        previousStatus: existing?.status ?? null,
        newStatus: status,
        observation,
        responsibleId,
      },
    });
  }

  return result;
}

/* ─── Clear (delete) a status ─── */
export async function clearActivityStatus(
  companyId: number,
  obligationCode: string,
  year: number,
  month: number,
) {
  const obligationId = await resolveObligationId(obligationCode);

  const existing = await prisma.activityStatus.findUnique({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
  });
  if (!existing) return null;

  await prisma.activityStatus.delete({
    where: { companyId_obligationId_year_month: { companyId, obligationId, year, month } },
  });

  // History: status removed
  await prisma.activityStatusHistory.create({
    data: {
      companyId,
      obligationId,
      year,
      month,
      previousStatus: existing.status,
      newStatus: null,
      observation: null,
      responsibleId: existing.responsibleId,
    },
  });

  return existing;
}

/* ─── Bulk upsert ─── */
export async function bulkUpsertActivityStatus(items: Array<{
  companyId: number;
  obligationCode: string;
  year: number;
  month: number;
  status: string;
  observation: string | null;
  responsibleId?: number | null;
}>) {
  const results = await Promise.allSettled(items.map((item) => upsertActivityStatus(item)));
  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed    = results.filter((r) => r.status === 'rejected').length;
  return { succeeded, failed };
}

/* ─── Bulk clear ─── */
export async function bulkClearActivityStatus(items: Array<{
  companyId: number;
  obligationCode: string;
  year: number;
  month: number;
}>) {
  const results = await Promise.allSettled(
    items.map((item) => clearActivityStatus(item.companyId, item.obligationCode, item.year, item.month)),
  );
  const succeeded = results.filter((r) => r.status === 'fulfilled').length;
  const failed    = results.filter((r) => r.status === 'rejected').length;
  return { succeeded, failed };
}
