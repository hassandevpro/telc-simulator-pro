import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";

const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads", "audio");
const MAX_BYTES = 20 * 1024 * 1024;

/**
 * Bibliothèque audio (Hören). v1 : fichiers écrits dans public/uploads —
 * fonctionne en local et sur serveur propre ; sur Vercel (système de
 * fichiers en lecture seule), brancher Vercel Blob ou S3 ici (v2).
 */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
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
