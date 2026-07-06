import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getStorage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

/* GET /api/health — diagnóstico público (isento do middleware).
   Mostra APENAS presença de variáveis (boolean) e conectividade — nunca valores
   secretos. Serve para diagnosticar o ambiente no Vercel sem acesso aos logs. */
export async function GET() {
  const dbUrl = process.env.DATABASE_URL ?? '';
  const env = {
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    AUTH_TRUST_HOST: process.env.AUTH_TRUST_HOST ?? null,
    AUTH_URL: process.env.AUTH_URL ?? null,
    DATABASE_URL: !!process.env.DATABASE_URL,
    DATABASE_URL_porta: dbUrl.match(/:(\d{4,5})\//)?.[1] ?? null,
    DATABASE_URL_pgbouncer: /pgbouncer=true/.test(dbUrl),
    DIRECT_URL: !!process.env.DIRECT_URL,
    SUPABASE_URL: !!process.env.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_STORAGE_BUCKET: process.env.SUPABASE_STORAGE_BUCKET ?? null,
  };

  let db = 'ok';
  let userCount: number | null = null;
  try {
    userCount = await prisma.user.count();
  } catch (e: unknown) {
    db = 'ERRO: ' + (e instanceof Error ? e.message.slice(0, 300) : String(e));
  }

  let storageBackend = 'desconhecido';
  try { storageBackend = getStorage().backend; } catch { storageBackend = 'erro'; }

  const ok = env.AUTH_SECRET && db === 'ok';
  return NextResponse.json({ ok, env, db, userCount, storageBackend });
}
