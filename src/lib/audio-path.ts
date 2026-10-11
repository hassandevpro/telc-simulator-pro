/**
 * Chemins d'audio dans le bucket privé « audio » — logique pure, partagée par
 * le serveur et les tests (qui vérifient la parité avec la migration SQL).
 */

/**
 * Nom de fichier accepté dans le bucket : UNE composante, caractères sûrs.
 * Pas de « / » (aucune remontée de dossier), pas de point initial.
 */
const SAFE_AUDIO_PATH = /^[A-Za-z0-9][A-Za-z0-9._-]{0,200}$/;

export function isSafeAudioPath(value: unknown): value is string {
  return typeof value === "string" && SAFE_AUDIO_PATH.test(value);
}

/**
 * Extrait le chemin d'une ancienne URL publique Supabase
 * (…/storage/v1/object/public/audio/<chemin>). Même règle que la migration
 * SQL 20261012090000_private_audio : null si l'URL n'a pas cette forme ou si
 * le nom n'est pas « sûr ».
 */
export function audioPathFromPublicUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const match = /\/storage\/v1\/object\/(?:public|sign)\/audio\/([A-Za-z0-9][A-Za-z0-9._-]{0,200})(?:[?#].*)?$/.exec(
    url,
  );
  return match ? match[1] : null;
}

/** Chemin statique servi par l'application elle-même (démo gratuite, dev local). */
export function isStaticAudioPath(url: string | null | undefined): url is string {
  return typeof url === "string" && url.startsWith("/") && !url.startsWith("//");
}

/**
 * Nom de fichier UNIQUE pour un nouvel audio : un fichier existant n'est
 * jamais remplacé (aucune route n'écrit avec upsert).
 */
export function uniqueAudioFileName(base: string, random: string): string {
  const safe = base.replace(/[^A-Za-z0-9._-]/g, "_").replace(/^[._-]+/, "").slice(0, 120);
  return `${Date.now()}-${random}-${safe || "audio"}`;
}

/** Identifiant aléatoire court pour nommer un nouvel audio. */
export function newAudioFileId(): string {
  return crypto.randomUUID().slice(0, 8);
}
