import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Proxy Next.js 16 (ex-`middleware.ts`, convention dépréciée depuis
 * Next 16 — cf. node_modules/next/dist/docs/.../upgrading/version-16.md).
 *
 * Il ne fait qu'un CONTRÔLE GROSSIER : rediriger vers /login un visiteur
 * non connecté (callback `authorized` de la config edge-safe, sans Prisma).
 * Il n'est PAS une autorisation : chaque Route Handler et chaque page
 * sensible revérifie elle-même l'identité et le rôle EN BASE
 * (lib/admin-guard.ts, lib/exam-access.ts, lib/session-lifecycle.ts).
 */
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/results/:path*",
    "/admin/:path*",
    "/center/:path*",
    "/join/:path*",
    "/session/:path*",
    "/audio-check",
  ],
};
