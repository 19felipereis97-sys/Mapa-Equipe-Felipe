/* Next.js instrumentation — roda uma vez no boot do runtime Node.
   O worker in-process só é iniciado quando WORKER_ENABLED=true (container/cron
   dedicado). Em serverless (Vercel) fica desligado — indicadores e relatórios
   rodam inline no request. */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.WORKER_ENABLED === 'true') {
    const { startWorker } = await import('@/worker/runtime');
    startWorker();
  }
}
