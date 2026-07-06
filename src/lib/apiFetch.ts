'use client';

/* Wrapper de fetch para chamadas à API interna.
   Trata 401 de forma global: se a sessão expirou/for inválida, redireciona para
   /login (preservando o destino) em vez de deixar cada tela mostrar um erro
   "Não autenticado" sem saída. Os demais status seguem normalmente. */
export async function apiFetch(input: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(input, init);
  if (res.status === 401 && typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
    const cb = encodeURIComponent(window.location.pathname + window.location.search);
    window.location.href = `/login?callbackUrl=${cb}`;
    // Interrompe o fluxo do chamador — a navegação já está acontecendo.
    throw new Error('Sessão expirada. Redirecionando para o login…');
  }
  return res;
}
