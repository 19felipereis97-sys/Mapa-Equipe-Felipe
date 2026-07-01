import prisma from '@/lib/prisma';

export type PortalUrgency = 'high' | 'medium' | 'normal';

const HIGH_KEYWORDS   = ['ALERTA', 'Intimação', 'INTIMAÇÃO', 'PAGAMENTO', 'exclusão', 'Exclusão', 'regularização', 'Regularização'];
const MEDIUM_KEYWORDS = ['AVISO', 'Comunicado', 'Juntada', 'Solicitação', 'Cadin', 'e-Processo', 'AVISO'];

export function detectUrgency(subject: string): PortalUrgency {
  if (HIGH_KEYWORDS.some((kw) => subject.includes(kw)))   return 'high';
  if (MEDIUM_KEYWORDS.some((kw) => subject.includes(kw))) return 'medium';
  return 'normal';
}

export interface PortalNotificationInput {
  companyId:        number;
  cnpj:             string;
  companyName:      string;
  notificationDate: string;
  subject:          string;
  urgency:          PortalUrgency;
  batchName:        string;
}

export async function createNotifications(items: PortalNotificationInput[]) {
  if (items.length === 0) return { created: 0 };
  await prisma.portalNotification.createMany({ data: items });
  return { created: items.length };
}

export async function listNotifications(completed: boolean) {
  return prisma.portalNotification.findMany({
    where: { completed },
    include: { company: { select: { id: true, corporateName: true, groupName: true, code: true } } },
    orderBy: [
      { urgency: 'asc' },   // high < medium < normal alphabetically — but we sort in app
      { notificationDate: 'asc' },
      { createdAt: 'asc' },
    ],
  });
}

export async function completeNotification(id: number) {
  return prisma.portalNotification.update({
    where: { id },
    data: { completed: true, completedAt: new Date() },
  });
}

export async function reopenNotification(id: number) {
  return prisma.portalNotification.update({
    where: { id },
    data: { completed: false, completedAt: null },
  });
}

export async function deleteNotification(id: number) {
  return prisma.portalNotification.delete({ where: { id } });
}

export async function clearHistory() {
  return prisma.portalNotification.deleteMany({ where: { completed: true } });
}
