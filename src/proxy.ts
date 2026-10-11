import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

/**
 * Protection des routes (ARCHITECTURE.md §2) — RÉACTIVÉE au Sprint 9.
 * Config edge-safe uniquement (aucun import Prisma) ; le callback
 * `authorized` redirige vers /login avec callbackUrl. La garde de rôle
 * ADMIN fine reste dans (admin)/admin/layout.tsx.
 */
export default NextAuth(authConfig).auth;

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
