import type { NextAuthConfig } from "next-auth";

/**
 * Configuration NextAuth edge-safe : consommée par le middleware
 * (aucun import Prisma/Node ici). Les providers complets vivent
 * dans src/lib/auth.ts.
 */
export const authConfig = {
  // Hors Vercel (serveur propre, Docker), NextAuth v5 exige de déclarer
  // l'hôte de confiance explicitement.
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    /**
     * Appelé par le middleware pour chaque route protégée
     * (voir src/middleware.ts). Redirige vers /login si non connecté.
     */
    authorized({ auth }) {
      return !!auth?.user;
    },
    jwt({ token, user }) {
      // À la connexion, on embarque rôle et plan dans le JWT.
      if (user && "role" in user) {
        token.role = user.role;
      }
      if (user && "plan" in user) {
        token.plan = (user as { plan?: string }).plan;
      }
      return token;
    },
    session({ session, token }) {
      if (session.user) {
        if (token.role) session.user.role = token.role as string;
        if (token.plan) session.user.plan = token.plan as string;
        if (token.sub) session.user.id = token.sub;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
