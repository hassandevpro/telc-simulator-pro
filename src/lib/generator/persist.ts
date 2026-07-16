import { db } from "@/lib/db";
import { Prisma } from "@/generated/prisma/client";
import type { GeneratedExam } from "./types";

export interface PersistedExam {
  examId: string;
  questionCount: number;
  /** Id de ExamPart par clé "sectionId/partId" — sert à rattacher l'audio. */
  partIdByKey: Record<string, string>;
}

/**
 * Écrit un examen généré en base : un Exam, ses ExamParts et toutes les
 * Questions (contenu + clé de correction). Même schéma que l'import du
 * Modelltest de démonstration — l'examen devient immédiatement jouable et
 * éditable dans l'admin. L'audio est rattaché ensuite (voir la route).
 */
export async function persistGeneratedExam(
  exam: GeneratedExam,
): Promise<PersistedExam> {
  const created = await db.exam.create({
    data: { title: exam.title, level: exam.level },
  });

  const partIdByKey: Record<string, string> = {};
  let questionCount = 0;

  for (const [key, part] of Object.entries(exam.parts)) {
    const [sectionId, partId] = key.split("/");
    // Le champ shared ne contient jamais audioUrl ici (l'audio est ajouté
    // après synthèse) ; on le stocke tel quel comme sharedContent.
    const dbPart = await db.examPart.create({
      data: {
        examId: created.id,
        sectionId,
        partId,
        sharedContent: part.shared as unknown as Prisma.InputJsonValue,
        audioUrl: null,
      },
    });
    partIdByKey[key] = dbPart.id;

    for (const question of part.questions) {
      await db.question.create({
        data: {
          partId: dbPart.id,
          position: question.position,
          type: part.type,
          content: question.content as unknown as Prisma.InputJsonValue,
          answerKey:
            question.answerKey === null
              ? Prisma.JsonNull
              : (question.answerKey as Prisma.InputJsonValue),
          points: question.points,
        },
      });
      questionCount += 1;
    }
  }

  return { examId: created.id, questionCount, partIdByKey };
}
