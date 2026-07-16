import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
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
  const { audioUrl, ...sharedContent } = shared;

  await db.$transaction([
    db.question.deleteMany({ where: { partId: part.id } }),
    db.examPart.update({
      where: { id: part.id },
      data: { sharedContent, audioUrl: audioUrl ?? null },
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
