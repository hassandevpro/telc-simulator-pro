import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/**
 * Client Supabase — Storage uniquement (bucket "audio", lecture/écriture
 * publiques au niveau objet ; la garde réelle est requireAdmin() côté
 * route API, jamais contournable côté client puisque cette route tourne
 * exclusivement sur le serveur).
 * Retourne null si les variables ne sont pas configurées : les appelants
 * basculent alors sur le stockage local (dev sans Supabase).
 */
export function getSupabaseStorage() {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, {
    auth: { persistSession: false },
  }).storage.from("audio");
}
