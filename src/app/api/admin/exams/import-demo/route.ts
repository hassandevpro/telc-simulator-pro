import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import {
  DEMO_B2_ANSWER_KEYS,
  DEMO_B2_CONTENT,
} from "@/lib/demo-b2-content";
import { Prisma } from "@/generated/prisma/client";

/**
 * Import du Modelltest de démonstration en base : crée un examen complet
 * (10 Teile, 62 questions, clés de correction, audios) éditable via
 * l'admin. Point de départ recommandé pour créer ses propres examens.
 */
export async function POST() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  const exam = await db.exam.create({
    data: {
      title: `${DEMO_B2_CONTENT.title} — Import`,
      level: DEMO_B2_CONTENT.level,
    },
  });

  let questionCount = 0;
  for (const [key, part] of Object.entries(DEMO_B2_CONTENT.parts)) {
    const [sectionId, partId] = key.split("/");
    const { audioUrl, ...sharedContent } = part.shared as {
      audioUrl?: string;
      [k: string]: unknown;
    };

    const dbPart = await db.examPart.create({
      data: {
        examId: exam.id,
        sectionId,
        partId,
        sharedContent: sharedContent as Prisma.InputJsonValue,
        audioUrl: audioUrl ?? null,
      },
    });

    for (const question of part.questions) {
      await db.question.create({
        data: {
          partId: dbPart.id,
          position: question.position,
          type: part.type,
          content: question.content as unknown as Prisma.InputJsonValue,
          answerKey:
            part.type === "WRITING"
              ? Prisma.JsonNull
              : (DEMO_B2_ANSWER_KEYS[question.id] ?? Prisma.JsonNull),
          points: question.points,
        },
      });
      questionCount += 1;
    }
  }

  return NextResponse.json(
    { id: exam.id, questionCount },
    { status: 201 },
  );
}
