import "server-only";

/**
 * Limiteur de débit à fenêtre fixe, EN MÉMOIRE.
 *
 * LIMITE CONNUE : sur une plateforme serverless (Vercel), chaque instance a
 * sa propre mémoire. Ce limiteur freine donc un attaquant par instance, pas
 * globalement. Il bloque la force brute naïve et les rafales, sans
 * dépendance ; pour une limite globale, brancher un stockage partagé
 * (Upstash Redis, table PostgreSQL) derrière la même interface.
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();
const MAX_KEYS = 10_000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    if (buckets.size >= MAX_KEYS) purgeExpired(now);
    bucket = { count: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }
  bucket.count += 1;
  return {
    allowed: bucket.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

function purgeExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
  // Toujours plein (attaque à clés multiples) : on repart de zéro plutôt
  // que de laisser la mémoire croître sans borne.
  if (buckets.size >= MAX_KEYS) buckets.clear();
}

/** Adresse du client derrière le proxy de la plateforme (meilleur effort). */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

/** Réservé aux tests. */
export function resetRateLimits(): void {
  buckets.clear();
}
