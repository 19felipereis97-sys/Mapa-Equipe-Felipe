import type { NextAuthConfig } from 'next-auth';

/* ─────────────────────────────────────────────────────────────────────────────
   Configuração compartilhada e EDGE-SAFE (sem Prisma, sem bcrypt).
   É esta que o middleware carrega para apenas decodificar/validar o JWT.
   O provider Credentials (que acessa o banco) vive em src/auth.ts, no runtime
   Node — nunca no edge.
──────────────────────────────────────────────────────────────────────────── */
export const authConfig = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [], // preenchido em src/auth.ts
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = (user as { role?: string }).role;
        token.uid = (user as { id?: string }).id;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { id?: string }).id = token.uid as string | undefined;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
