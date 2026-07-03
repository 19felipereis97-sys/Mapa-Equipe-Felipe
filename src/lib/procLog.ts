/* ─────────────────────────────────────────────────────────────────────────────
   Log estruturado de processamento pesado (importações, bulk, relatórios).

   Fase 1: emite JSON no stdout do container (capturado pelos logs do Docker),
   com etapa, duração em ms, quantidade de registros e metadados. A interface
   foi desenhada para, na Fase 2, também persistir em `logs_processamento` /
   `erros_processamento` sem alterar nenhum ponto de chamada — basta trocar a
   implementação de `emit()`.
──────────────────────────────────────────────────────────────────────────── */

export interface ProcLogFields {
  etapa: string;
  taskId?: string | number | null;
  userId?: string | number | null;
  registros?: number;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

function emit(level: 'info' | 'error', fields: ProcLogFields & { erro?: string; stack?: string }): void {
  // Ponto único de saída — trocar por gravação em banco na Fase 2.
  const line = JSON.stringify({ ts: new Date().toISOString(), level, scope: 'proc', ...fields });
  if (level === 'error') console.error(line);
  else console.log(line);
}

export function logProc(fields: ProcLogFields): void {
  emit('info', fields);
}

export function logProcError(fields: ProcLogFields & { erro: string; stack?: string }): void {
  emit('error', fields);
}

/**
 * Executa `fn` medindo o tempo e registrando um log estruturado no fim.
 * Em erro, registra o erro (com stack) e re-lança, para o chamador tratar.
 */
export async function timed<T>(
  etapa: string,
  fn: () => Promise<T>,
  extra?: Omit<ProcLogFields, 'etapa' | 'durationMs'>,
): Promise<T> {
  const start = Date.now();
  try {
    const result = await fn();
    logProc({ etapa, durationMs: Date.now() - start, ...extra });
    return result;
  } catch (e: unknown) {
    logProcError({
      etapa,
      durationMs: Date.now() - start,
      erro: e instanceof Error ? e.message : String(e),
      stack: e instanceof Error ? e.stack : undefined,
      ...extra,
    });
    throw e;
  }
}
