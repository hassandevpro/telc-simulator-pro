import { NextResponse } from "next/server";
import { z } from "zod";
import { getStructureForLevel } from "@/config/exam-structure";
import { getExamContent, getExamScoringData } from "@/lib/exam-content";
import { scoreSession } from "@/lib/scoring/score-session";
import { answerMapSchema } from "@/lib/validators";

const payloadSchema = z.object({
  examId: z.string().min(1),
  answers: answerMapSchema,
});

/**
 * API de correction. Les réponses montent, le score descend — les clés de
 * correction ne quittent JAMAIS le serveur. v1 (LocalStorage-first) : le
 * client envoie ses réponses ; v2 (PostgreSQL) : la route lira les Answer
 * en base et revalidera les délais (now − startedAt ≤ durée + tolérance).
 */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = payloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const { examId, answers } = parsed.data;

  const [bundle, questions] = await Promise.all([
    getExamContent(examId),
    getExamScoringData(examId),
  ]);
  if (!bundle || questions.length === 0) {
    return NextResponse.json({ error: "Examen inconnu." }, { status: 404 });
  }

  const score = scoreSession(
    answers,
    questions,
    getStructureForLevel(bundle.level),
  );
  return NextResponse.json(score);
}
