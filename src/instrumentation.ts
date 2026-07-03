/* Next.js instrumentation — roda uma vez no boot do servidor.
   Inicia o worker in-process apenas no runtime Node (nunca no Edge/middleware). */
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startWorker } = await import('@/worker/runtime');
    startWorker();
  }
}
