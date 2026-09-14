import { NextResponse } from "next/server";
import { z } from "zod";
import { allLessonSlugs } from "@/content/vorbereitung";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Progression de la Vorbereitung.
 *
 * La Vorbereitung est accessible SANS compte : ces routes ne servent qu'aux
 * utilisateurs connectés. Pour un visiteur anonyme, le client garde la
 * progression en LocalStorage et n'appelle pas l'API — d'où le 401 explicite
 * plutôt qu'une redirection.
 */

/** Progression complète du candidat connecté, indexée par slug. */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const rows = await db.lessonProgress.findMany({
    where: { userId },
    select: {
      lessonSlug: true,
      completed: true,
      score: true,
      maxScore: true,
      updatedAt: true,
    },
  });

  return NextResponse.json(
    Object.fromEntries(
      rows.map((row) => [
        row.lessonSlug,
        {
          completed: row.completed,
          score: row.score,
          maxScore: row.maxScore,
          updatedAt: row.updatedAt.getTime(),
        },
      ]),
    ),
  );
}

const progressSchema = z
  .object({
    // Le slug doit exister dans le catalogue : la base ne connaît pas le
    // contenu, c'est donc ici que se fait la validation d'intégrité.
    lessonSlug: z.string().refine((slug) => allLessonSlugs().includes(slug), {
      message: "Unbekannte Lektion.",
    }),
    completed: z.boolean().optional(),
    score: z.number().int().min(0).optional(),
    maxScore: z.number().int().min(0).optional(),
  })
  // Un score sans total n'a pas de sens, et l'inverse non plus.
  .refine(
    (body) => (body.score === undefined) === (body.maxScore === undefined),
    { message: "score und maxScore müssen zusammen gesendet werden." },
  )
  .refine((body) => body.score === undefined || body.score <= body.maxScore!, {
    message: "score darf maxScore nicht überschreiten.",
  });

/** Marque une leçon comme lue et/ou enregistre le score d'exercice. */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const parsed = progressSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Ungültige Daten." },
      { status: 400 },
    );
  }

  const { lessonSlug, completed, score, maxScore } = parsed.data;

  const row = await db.lessonProgress.upsert({
    where: { userId_lessonSlug: { userId, lessonSlug } },
    // À l'update on n'écrase QUE ce qui est envoyé : enregistrer un score ne
    // doit pas effacer le « lu », et inversement.
    update: {
      ...(completed === undefined ? {} : { completed }),
      ...(score === undefined ? {} : { score, maxScore }),
    },
    create: {
      userId,
      lessonSlug,
      completed: completed ?? false,
      score: score ?? null,
      maxScore: maxScore ?? null,
    },
    select: { completed: true, score: true, maxScore: true },
  });

  return NextResponse.json(row);
}
