import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "./db";
import { authConfig } from "./auth.config";

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

/**
 * NextAuth v5 — stratégie JWT + provider Credentials branché sur Prisma.
 * authorize : lookup par e-mail, comparaison bcrypt, embarque le rôle
 * (STUDENT | CENTER_ADMIN | SUPER_ADMIN) dans le JWT via auth.config.
 * Ce module importe Prisma : il n'est JAMAIS importé par le middleware,
 * qui n'utilise que la config edge-safe (auth.config.ts).
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Identifiants",
      credentials: {
        email: { label: "E-Mail", type: "email" },
        password: { label: "Passwort", type: "password" },
      },
      async authorize(credentials) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await db.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!user) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        // Connexion refusée tant que l'e-mail n'est pas confirmé. On ne
        // distingue pas ce cas d'un mauvais mot de passe côté client (pas
        // de fuite) : le formulaire propose systématiquement le renvoi.
        if (!user.emailVerified) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          plan: user.plan,
        };
      },
    }),
  ],
});
