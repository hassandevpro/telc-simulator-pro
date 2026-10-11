import "server-only";
import { createClient } from "@supabase/supabase-js";
import { storageCredentials } from "@/lib/storage-credentials";

/**
 * Client Supabase Storage (bucket "audio") — SERVEUR UNIQUEMENT.
 *
 * Il utilise la clé SECRÈTE `SUPABASE_SERVICE_ROLE_KEY`, jamais exposée au
 * navigateur (aucun préfixe NEXT_PUBLIC_, module `server-only`). Les
 * opérations privilégiées (liste, upload, URL d'upload signée) ne sont
 * appelées que derrière requireAdmin().
 *
 * Avant : ce client utilisait la clé ANON, publique par construction (elle
 * est dans le JavaScript servi au navigateur). Pour que createSignedUploadUrl
 * fonctionne avec elle, le bucket devait autoriser l'ÉCRITURE au rôle `anon`
 * — donc à n'importe qui disposant de la clé, sans passer par nos routes.
 * Avec la clé de service, ces règles d'écriture anonymes doivent être
 * SUPPRIMÉES dans Supabase (voir docs/SECURITY.md).
 *
 * Retourne null si la clé de service n'est pas configurée : les routes
 * admin basculent alors sur le stockage local (développement uniquement —
 * non persistant sur Vercel). On ne retombe JAMAIS sur la clé anon.
 */

const BUCKET = "audio";

export function getSupabaseStorage() {
  const credentials = storageCredentials();
  if (!credentials) return null;
  return createClient(credentials.url, credentials.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  }).storage.from(BUCKET);
}
