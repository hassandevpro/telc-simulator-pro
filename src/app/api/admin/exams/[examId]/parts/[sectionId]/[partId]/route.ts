import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { isSafeAudioPath, isStaticAudioPath } from "@/lib/audio-path";
import { db } from "@/lib/db";
import { partContentPayloadSchema } from "@/lib/validators";
import { Prisma } from "@/generated/prisma/client";

/**
 * Lecture du contenu ÉDITABLE d'un Teil — INCLUT answerKey (admin
 * uniquement : c'est la seule route qui expose les clés, protégée par
 * requireAdmin). Format identique au payload d'écriture.
 */
export async function GET(
  _request: Request,
  {
    params,
  }: { params: Promise<{ examId: string; sectionId: string; partId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const { examId, sectionId, partId } = await params;
  const part = await db.examPart.findUnique({
    where: { examId_sectionId_partId: { examId, sectionId, partId } },
    include: { questions: { orderBy: { position: "asc" } } },
  });
  if (!part) {
    return NextResponse.json({ error: "Teil unbekannt." }, { status: 404 });
  }
  return NextResponse.json({
    shared: part.sharedContent ?? {},
    // Emplacement de l'audio (chemin dans le bucket privé, ou ancienne URL
    // / chemin statique) : lecture ADMIN uniquement. L'écoute passe par
    // /api/admin/audio/preview (URL signée).
    audioPath: part.audioPath,
    audioUrl: part.audioUrl,
    questions: part.questions.map((question) => ({
      position: question.position,
      points: question.points,
      content: question.content,
      answerKey: question.answerKey ?? null,
    })),
  });
}

/**
 * Remplacement complet du contenu d'un Teil, validé par le schéma Zod du
 * type (lib/validators). Les questions sont recréées : éditer le contenu
 * d'un examen invalide les sessions en cours dessus — comportement assumé.
 */
export async function PUT(
  request: Request,
  {
    params,
  }: { params: Promise<{ examId: string; sectionId: string; partId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const { examId, sectionId, partId } = await params;

  const body = await request.json().catch(() => null);
  const parsed = partContentPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Inhalt ungültig.", details: parsed.error.issues },
      { status: 400 },
    );
  }

  const part = await db.examPart.findUnique({
    where: { examId_sectionId_partId: { examId, sectionId, partId } },
  });
  if (!part) {
    return NextResponse.json({ error: "Teil unbekannt." }, { status: 404 });
  }

  const { type: _type, shared, questions } = parsed.data;
  // L'audio est géré par le PATCH ci-dessous, jamais par le JSON de contenu :
  // un contenu collé ou édité ne peut ni détacher ni rediriger un audio.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { audioUrl: _ignoredAudioUrl, ...sharedContent } = shared;

  await db.$transaction([
    db.question.deleteMany({ where: { partId: part.id } }),
    db.examPart.update({
      where: { id: part.id },
      data: { sharedContent },
    }),
    ...questions.map((question) =>
      db.question.create({
        data: {
          partId: part.id,
          position: question.position,
          type: _type,
          content: question.content,
          answerKey: question.answerKey ?? Prisma.JsonNull,
          points: question.points,
        },
      }),
    ),
  ]);

  return NextResponse.json({ ok: true, questionCount: questions.length });
}

/**
 * Association audio du Teil — écriture CIBLÉE, découplée du PUT (qui recrée
 * tout le contenu) : l'upload dans l'éditeur persiste l'audio en un geste.
 *
 * Corps : { audioPath: string | null } — chemin d'un fichier du bucket PRIVÉ
 * (nom sûr, une seule composante). Aucune URL http(s) n'est acceptée : une
 * URL publique permanente contournerait le contrôle d'accès. Seul un chemin
 * statique de l'application ("/audio/demo/…", démo gratuite) reste permis via
 * { audioUrl: "/…" }. Rattacher un audio efface l'ancienne audioUrl (la
 * colonne n'est jamais lue quand audioPath existe).
 */
export async function PATCH(
  request: Request,
  {
    params,
  }: { params: Promise<{ examId: string; sectionId: string; partId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const { examId, sectionId, partId } = await params;

  const body = (await request.json().catch(() => null)) as {
    audioPath?: unknown;
    audioUrl?: unknown;
  } | null;

  let data: { audioPath: string | null; audioUrl: string | null };
  if (body && "audioPath" in body) {
    if (body.audioPath !== null && !isSafeAudioPath(body.audioPath)) {
      return NextResponse.json(
        { error: "audioPath muss ein Dateiname im Audio-Bucket oder null sein." },
        { status: 400 },
      );
    }
    data = { audioPath: body.audioPath, audioUrl: null };
  } else if (body && "audioUrl" in body) {
    if (body.audioUrl !== null && !isStaticAudioPath(body.audioUrl as string)) {
      return NextResponse.json(
        { error: "Nur interne Pfade (/…) sind erlaubt, keine öffentlichen URLs." },
        { status: 400 },
      );
    }
    data = { audioPath: null, audioUrl: (body.audioUrl as string | null) ?? null };
  } else {
    return NextResponse.json({ error: "audioPath fehlt." }, { status: 400 });
  }

  const part = await db.examPart.findUnique({
    where: { examId_sectionId_partId: { examId, sectionId, partId } },
  });
  if (!part) {
    return NextResponse.json({ error: "Teil unbekannt." }, { status: 404 });
  }

  await db.examPart.update({ where: { id: part.id }, data });
  return NextResponse.json({ ok: true, ...data });
}
