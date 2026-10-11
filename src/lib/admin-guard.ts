import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Gardes d'autorisation SERVEUR. Le rôle est TOUJOURS relu en base, jamais
 * pris dans le JWT : un administrateur rétrogradé ou un compte supprimé perd
 * l'accès à l'administration à la requête suivante, sans attendre
 * l'expiration de son jeton.
 */

async function currentDbUser() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  return user ? { session, user } : null;
}

/**
 * Garde de l'administration PLATEFORME (examens, tous les utilisateurs,
 * audio) : réservée au SUPER_ADMIN. Un CENTER_ADMIN ne gère que son propre
 * centre via requireCenterAdmin / l'espace /center. La garde d'UI
 * équivalente vit dans (admin)/admin/layout.tsx.
 */
export async function requireAdmin() {
  const current = await currentDbUser();
  if (current?.user.role !== "SUPER_ADMIN") return null;
  return current.session;
}

/**
 * Garde de l'espace centre. Autorise le rôle CENTER_ADMIN (en base) **ou**
 * tout utilisateur qui possède déjà un centre — indispensable juste après
 * un achat self-service.
 */
export async function requireCenterAdmin() {
  const current = await currentDbUser();
  if (!current) return null;
  if (current.user.role === "CENTER_ADMIN") return current.session;
  const owned = await db.center.findUnique({
    where: { ownerId: current.user.id },
    select: { id: true },
  });
  return owned ? current.session : null;
}

/** Rôle EN BASE de l'utilisateur connecté (null si anonyme ou supprimé). */
export async function currentRole(): Promise<string | null> {
  return (await currentDbUser())?.user.role ?? null;
}
