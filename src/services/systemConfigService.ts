import prisma from '@/lib/prisma';
import type { SystemConfigKey } from '@/types/system';

export async function getConfig(key: SystemConfigKey): Promise<string | null> {
  const record = await prisma.systemConfig.findUnique({ where: { key } });
  return record?.value ?? null;
}

export async function setConfig(key: SystemConfigKey, value: string): Promise<void> {
  await prisma.systemConfig.upsert({
    where: { key },
    update: { value },
    create: { key, value },
  });
}

export async function getAllConfigs(): Promise<Record<string, string>> {
  const records = await prisma.systemConfig.findMany();
  return Object.fromEntries(records.map((r) => [r.key, r.value]));
}
