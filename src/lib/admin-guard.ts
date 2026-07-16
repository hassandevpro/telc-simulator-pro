import { auth } from "@/lib/auth";

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

/** Garde de l'espace centre : réservé au CENTER_ADMIN (gestion de ses élèves). */
export async function requireCenterAdmin() {
  const session = await auth();
  if (session?.user?.role !== "CENTER_ADMIN") return null;
  return session;
}
