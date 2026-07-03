/**
 * Retorna o mês de competência contábil (1–12).
 * A contabilidade trabalha com um mês de atraso:
 * em Junho processamos Maio, em Janeiro processamos Dezembro do ano anterior.
 */
export function getCompetenceMonth(): number {
  const calendarMonth = new Date().getMonth(); // 0-indexed (0=Jan)
  return calendarMonth === 0 ? 12 : calendarMonth; // se Jan → 12 (Dez), senão mês anterior 1-indexed
}

export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function formatDate(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleDateString('pt-BR');
}

export function formatDateTime(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('pt-BR');
}

/**
 * Divide um array em pedaços de tamanho fixo. Usado para processar grandes
 * volumes (importações, bulk de status) em lotes controlados, evitando
 * segurar conexão do pool por muito tempo ou disparar rajadas de queries.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}
