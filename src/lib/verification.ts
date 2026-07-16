import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Jetons de vérification d'e-mail. Le jeton en clair n'est envoyé que par
 * e-mail ; seule son empreinte SHA-256 est stockée (comme un mot de passe).
 * Usage unique, expiration 24 h.
 */

const TTL_MS = 1000 * 60 * 60 * 24;

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Crée un jeton (un seul actif par e-mail) et renvoie sa valeur en clair. */
export async function createVerificationToken(email: string): Promise<string> {
  const token = randomBytes(32).toString("hex");
  await db.verificationToken.deleteMany({ where: { email } });
  await db.verificationToken.create({
    data: {
      email,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + TTL_MS),
    },
  });
  return token;
}

/**
 * Consomme un jeton : renvoie l'e-mail associé s'il est valide et non
 * expiré, sinon null. Le jeton est supprimé dans tous les cas (usage unique).
 */
export async function consumeVerificationToken(
  token: string,
): Promise<string | null> {
  const row = await db.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
  });
  if (!row) return null;
  await db.verificationToken.delete({ where: { id: row.id } }).catch(() => undefined);
  if (row.expiresAt.getTime() < Date.now()) return null;
  return row.email;
}
