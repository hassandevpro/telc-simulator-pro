import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { newAudioFileId, uniqueAudioFileName } from "@/lib/audio-path";
import { getSupabaseStorage } from "@/lib/supabase-storage";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "audio");
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Bibliothèque audio (Hören) — ADMIN uniquement. Supabase Storage en priorité
 * (bucket PRIVÉ "audio", clé de service côté serveur) ; repli sur le disque
 * local si le stockage n'est pas configuré — pratique en développement,
 * mais NE PERSISTE PAS sur Vercel (système de fichiers en lecture seule).
 *
 * Aucune URL publique n'est renvoyée : on désigne un fichier par son CHEMIN
 * dans le bucket. L'aperçu admin passe par /api/admin/audio/preview (URL
 * signée courte) et les candidats par /api/sessions/{id}/audio/…
 */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  const storage = getSupabaseStorage();
  if (storage) {
    const { data, error } = await storage.list("", {
      sortBy: { column: "created_at", order: "desc" },
    });
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      data
        .filter((file) => file.name && !file.name.startsWith("."))
        .map((file) => ({ name: file.name, path: file.name })),
    );
  }

  try {
    const files = (await readdir(UPLOAD_DIR)).filter(
      (name) => !name.startsWith("."),
    );
    return NextResponse.json(
      files.map((name) => ({ name, path: name })),
    );
  } catch {
    return NextResponse.json([]);
  }
}

export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const formData = await request.formData().catch(() => null);
  const file = formData?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Keine Datei." }, { status: 400 });
  }
  if (!file.type.startsWith("audio/")) {
    return NextResponse.json(
      { error: "Nur Audiodateien sind erlaubt." },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: "Datei zu groß (max. 20 MB)." },
      { status: 400 },
    );
  }

  // Nom UNIQUE : un fichier existant n'est jamais remplacé.
  const fileName = uniqueAudioFileName(file.name, newAudioFileId());

  const storage = getSupabaseStorage();
  if (storage) {
    const { error } = await storage.upload(
      fileName,
      Buffer.from(await file.arrayBuffer()),
      { contentType: file.type, cacheControl: "31536000", upsert: false },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ path: fileName }, { status: 201 });
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, fileName),
    Buffer.from(await file.arrayBuffer()),
  );
  return NextResponse.json({ path: fileName }, { status: 201 });
}
