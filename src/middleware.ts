import NextAuth from 'next-auth';
import { NextResponse } from 'next/server';
import { authConfig } from '@/auth.config';

// Instância edge-safe apenas para validar o JWT (sem Prisma).
const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const path = nextUrl.pathname;

  // Rotas sempre liberadas: fluxo de autenticação e tela de login.
  if (path.startsWith('/api/auth') || path.startsWith('/login')) {
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    // API → 401 JSON (não redireciona um fetch para HTML de login).
    if (path.startsWith('/api')) {
      return NextResponse.json({ error: 'Não autenticado', success: false }, { status: 401 });
    }
    // Páginas → redireciona para /login preservando o destino.
    const loginUrl = new URL('/login', nextUrl);
    loginUrl.searchParams.set('callbackUrl', path + nextUrl.search);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

// Protege tudo, exceto assets estáticos e ícones/manifest do PWA.
export const config = {
  matcher: [
    '/((?!api/health|_next/static|_next/image|favicon.ico|icons/|manifest.json|apple-touch-icon.png|robots.txt).*)',
  ],
};
