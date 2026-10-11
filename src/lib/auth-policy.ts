/**
 * Règles d'authentification, sans NextAuth ni Prisma — testables telles
 * quelles. lib/auth.ts les applique.
 */

/* ─────────────────────────── Liaison Google ──────────────────────────── */

export interface ExistingAccount {
  passwordHash: string | null;
  /** "LINK" | "GOOGLE" | null — preuve de possession de l'adresse. */
  emailVerifiedBy: string | null;
}

export type GoogleDecision =
  | { kind: "create" }
  | { kind: "link" }
  | { kind: "refuse"; reason: "GOOGLE_EMAIL_UNVERIFIED" | "ACCOUNT_UNVERIFIED" };

/**
 * Connexion Google pour une adresse donnée.
 *
 * Le danger : un attaquant inscrit d'avance l'adresse de sa victime avec SON
 * mot de passe, sans jamais la vérifier (la vérification est facultative).
 * Si la victime se connecte ensuite avec Google et qu'on la rattache à ce
 * compte, l'attaquant garde un accès par mot de passe à un compte que la
 * victime croit le sien — et qu'elle va peut-être payer.
 *
 * Règle : on ne rattache JAMAIS un compte à mot de passe dont l'adresse n'a
 * pas été prouvée par un lien e-mail. Aucun compte existant n'est modifié
 * (ni mot de passe effacé, ni fusion) : la connexion Google est simplement
 * refusée avec une explication. Un compte créé via Google (sans mot de
 * passe) est toujours rattachable.
 */
export function decideGoogleSignIn(
  existing: ExistingAccount | null,
  googleEmailVerified: boolean,
): GoogleDecision {
  if (!googleEmailVerified) return { kind: "refuse", reason: "GOOGLE_EMAIL_UNVERIFIED" };
  if (!existing) return { kind: "create" };
  if (existing.passwordHash === null) return { kind: "link" };
  if (existing.emailVerifiedBy === "LINK") return { kind: "link" };
  return { kind: "refuse", reason: "ACCOUNT_UNVERIFIED" };
}

/* ────────────────────── Fraîcheur du rôle dans le JWT ────────────────── */

/**
 * Le rôle et le plan sont relus en base au plus tard toutes les 60 s : un
 * administrateur rétrogradé ou un compte supprimé perd ses droits en moins
 * d'une minute sur toutes les pages, et IMMÉDIATEMENT sur les routes
 * d'administration (requireAdmin relit la base à chaque appel).
 */
export const ROLE_REFRESH_MS = 60_000;

export interface RoleToken {
  sub?: string;
  role?: string;
  plan?: string;
  checkedAt?: number;
  [key: string]: unknown;
}

export async function refreshRoleToken<T extends RoleToken>(
  token: T,
  loadUser: (id: string) => Promise<{ role: string; plan: string } | null>,
  now: number = Date.now(),
): Promise<T | null> {
  if (!token.sub) return null;
  if (typeof token.checkedAt === "number" && now - token.checkedAt < ROLE_REFRESH_MS) {
    return token;
  }
  const fresh = await loadUser(token.sub);
  // Compte supprimé : la session est invalidée (cookie effacé).
  if (!fresh) return null;
  return { ...token, role: fresh.role, plan: fresh.plan, checkedAt: now };
}
