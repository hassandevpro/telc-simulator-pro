import "server-only";

/**
 * Identifiants du client Storage. Pure (lit seulement l'environnement) :
 * c'est ici que se décide QUELLE clé est utilisée — jamais la clé anon.
 */
export function storageCredentials(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // Garde-fous de configuration : une clé de service placée dans une
  // variable publique, ou confondue avec la clé anon, est refusée.
  if (process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY est définie : la clé de service serait exposée au navigateur. Supprimez-la.",
    );
  }
  if (!url || !serviceKey) return null;
  if (serviceKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY est égale à la clé anon publique.");
  }
  return { url, key: serviceKey };
}
