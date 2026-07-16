import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSupabaseStorage } from "@/lib/supabase-storage";

/**
 * Émet une autorisation d'upload signée pour Supabase Storage.
 * Contourne la limite de corps de requête des fonctions Vercel (~4,5 Mo,
 * non configurable) : le navigateur envoie ensuite les octets DIRECTEMENT
 * à Supabase avec ce jeton, jamais via cette fonction serverless.
 * La garde admin est ici, à l'émission — le jeton lui-même est à usage
 * unique et borné à un seul chemin.
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

  const { data, error } = await storage.createSignedUploadUrl(fileName);
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
