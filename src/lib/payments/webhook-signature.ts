import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Compare un secret partagé reçu dans un en-tête de webhook (Flutterwave :
 * `verif-hash`) au secret attendu, à TEMPS CONSTANT. Les deux valeurs sont
 * d'abord condensées (SHA-256) : timingSafeEqual exige des longueurs égales,
 * et comparer les condensés ne révèle pas la longueur du secret.
 */
export function verifySharedSecret(
  received: string | null | undefined,
  expected: string | null | undefined,
): boolean {
  if (!expected || typeof received !== "string" || received.length === 0) {
    return false;
  }
  const digest = (value: string) =>
    createHash("sha256").update(value, "utf8").digest();
  return timingSafeEqual(digest(received), digest(expected));
}
