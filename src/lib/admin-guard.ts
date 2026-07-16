import { auth } from "@/lib/auth";

/**
 * Garde des API admin : session authentifiée avec rôle SUPER_ADMIN ou
 * CENTER_ADMIN, sinon null → la route répond 403. La garde d'UI
 * équivalente vit dans (admin)/admin/layout.tsx.
 */
export async function requireAdmin() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "SUPER_ADMIN" && role !== "CENTER_ADMIN") return null;
  return session;
}
