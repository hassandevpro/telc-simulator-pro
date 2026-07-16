import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { getSupabaseStorage } from "@/lib/supabase-storage";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "audio");
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Bibliothèque audio (Hören). Supabase Storage en priorité (bucket
 * "audio", persistant en production Vercel) ; repli sur le disque local
 * si NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY ne sont pas configurées —
 * pratique en développement sans dépendance externe, mais NE PERSISTE
 * PAS sur Vercel (système de fichiers en lecture seule en production).
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
      data.map((file) => ({
        name: file.name,
        url: storage.getPublicUrl(file.name).data.publicUrl,
      })),
    );
  }

  try {
    const files = (await readdir(UPLOAD_DIR)).filter(
      (name) => !name.startsWith("."),
    );
    return NextResponse.json(
      files.map((name) => ({ name, url: `/uploads/audio/${name}` })),
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

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const fileName = `${Date.now()}-${safeName}`;

  const storage = getSupabaseStorage();
  if (storage) {
    const { error } = await storage.upload(
      fileName,
      Buffer.from(await file.arrayBuffer()),
      { contentType: file.type, cacheControl: "31536000" },
    );
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { url: storage.getPublicUrl(fileName).data.publicUrl },
      { status: 201 },
    );
  }

  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(
    path.join(UPLOAD_DIR, fileName),
    Buffer.from(await file.arrayBuffer()),
  );
  return NextResponse.json(
    { url: `/uploads/audio/${fileName}` },
    { status: 201 },
  );
}
