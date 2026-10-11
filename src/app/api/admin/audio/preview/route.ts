import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isSafeAudioPath } from "@/lib/audio-path";
import { getSupabaseStorage } from "@/lib/supabase-storage";

/** Validité d'un aperçu admin — assez pour écouter une piste, pas plus. */
const PREVIEW_TTL_SECONDS = 600;

/**
 * Aperçu d'un audio pour l'ADMINISTRATION : URL signée de courte durée.
 * Le bucket étant privé, l'éditeur ne peut plus pointer une URL publique.
 * Réservé à requireAdmin (rôle relu en base).
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const path = new URL(request.url).searchParams.get("path");
  if (!isSafeAudioPath(path)) {
    return NextResponse.json({ error: "Ungültiger Pfad." }, { status: 400 });
  }

  const storage = getSupabaseStorage();
  if (!storage) {
    // Développement sans Supabase : fichier local.
    return NextResponse.json({ url: `/uploads/audio/${path}` });
  }
  const { data, error } = await storage.createSignedUrl(path, PREVIEW_TTL_SECONDS);
  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Datei nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json(
    { url: data.signedUrl },
    { headers: { "Cache-Control": "no-store" } },
  );
}
