import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Garde de l'administration PLATEFORME (examens, tous les utilisateurs,
 * audio) : réservée au SUPER_ADMIN. Un CENTER_ADMIN ne gère que son propre
 * centre via requireCenterAdmin / l'espace /center. La garde d'UI
 * équivalente vit dans (admin)/admin/layout.tsx.
 */
export async function requireAdmin() {
  const session = await auth();
  if (session?.user?.role !== "SUPER_ADMIN") return null;
  return session;
}

/**
 * Garde de l'espace centre. Autorise le rôle CENTER_ADMIN **ou** tout
 * utilisateur qui possède déjà un centre en base — indispensable juste
 * après un achat self-service (le rôle du JWT n'est mis à jour qu'à la
 * prochaine connexion, mais le centre existe déjà).
 */
export async function requireCenterAdmin() {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  if (session?.user?.role === "CENTER_ADMIN") return session;
  const owned = await db.center.findUnique({
    where: { ownerId: id },
    select: { id: true },
  });
  return owned ? session : null;
}
