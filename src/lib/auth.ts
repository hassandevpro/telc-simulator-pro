import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
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
    // Connexion / inscription via Google (OAuth). Le compte est créé ou
    // rattaché dans le callback signIn (voir ci-dessous) : stratégie JWT,
    // sans adapter Prisma, donc c'est nous qui gérons l'upsert en base.
    Google({
      allowDangerousEmailAccountLinking: true,
    }),
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

        // Compte Google (sans mot de passe local) : la connexion par
        // identifiants est impossible — il faut passer par « Mit Google ».
        if (!user.passwordHash) return null;

        const valid = await bcrypt.compare(
          parsed.data.password,
          user.passwordHash,
        );
        if (!valid) return null;

        // Connexion refusée tant que l'e-mail n'est pas confirmé — UNIQUEMENT
        // si la vérification est activée (EMAIL_VERIFICATION_REQUIRED="true").
        // Sinon on ne bloque pas (pas encore d'envoi d'e-mails opérationnel).
        if (
          process.env.EMAIL_VERIFICATION_REQUIRED === "true" &&
          !user.emailVerified
        ) {
          return null;
        }

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
  callbacks: {
    // On conserve les callbacks edge-safe (authorized/jwt/session) et on
    // ajoute signIn, qui a besoin de Prisma (donc vit ici, pas dans la config).
    ...authConfig.callbacks,
    /**
     * Provider Google : upsert du compte candidat (stratégie JWT, sans
     * adapter). On (re)crée l'utilisateur si besoin, puis on renseigne
     * `user.id/role/plan` avec les valeurs EN BASE pour que le JWT porte
     * notre identifiant interne (et non le « sub » Google).
     */
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.toLowerCase();
      if (!email) return false;

      const existing = await db.user.findUnique({ where: { email } });
      const dbUser =
        existing ??
        (await db.user.create({
          data: {
            email,
            name: user.name ?? email.split("@")[0],
            passwordHash: null,
            role: "STUDENT",
            plan: "FREE",
            // Compte Google : e-mail déjà vérifié par Google.
            emailVerified: new Date(),
          },
        }));

      // On propage l'identité interne vers le JWT (callback jwt).
      user.id = dbUser.id;
      user.role = dbUser.role;
      user.plan = dbUser.plan;
      return true;
    },
  },
});
