import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSupabaseStorage } from "@/lib/supabase-storage";

/**
 * Émet une autorisation d'upload signée pour Supabase Storage.
 * Contourne la limite de corps de requête des fonctions Vercel (~4,5 Mo,
 * non configurable) : le navigateur envoie ensuite les octets DIRECTEMENT
 * à Supabase avec ce jeton, jamais via cette fonction serverless.
 * La garde admin est ici, à l'émission — le jeton lui-même est à usage
 * unique, borné à un seul chemin neuf, et émis avec la clé de service
 * (lib/supabase-storage.ts) : le bucket n'a besoin d'AUCUNE règle
 * d'écriture pour les rôles anon/authenticated.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  const storage = getSupabaseStorage();
  if (!storage) {
    // Pas de Supabase configuré : le client bascule sur l'upload classique
    // (POST /api/admin/audio) — fonctionne en dev tant que le fichier
    // reste sous la limite de la plateforme.
    return NextResponse.json(
      { error: "Cloud-Speicher nicht konfiguriert." },
      { status: 501 },
    );
  }

  const body = await request.json().catch(() => null);
  const originalName = typeof body?.name === "string" ? body.name : "audio";
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;

  // upsert: false — le jeton ne permet que de CRÉER ce chemin, jamais de
  // remplacer un audio existant.
  const { data, error } = await storage.createSignedUploadUrl(fileName, {
    upsert: false,
  });
  if (error || !data) {
    return NextResponse.json(
      { error: error?.message ?? "Signatur fehlgeschlagen." },
      { status: 500 },
    );
  }

  return NextResponse.json({
    path: data.path,
    token: data.token,
    publicUrl: storage.getPublicUrl(fileName).data.publicUrl,
  });
}
