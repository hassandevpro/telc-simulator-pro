import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getStructureForLevel } from "@/config/exam-structure";
import { getExamScoringData } from "@/lib/exam-content";
import { scoreSession } from "@/lib/scoring/score-session";
import type { Level } from "@/types/exam";
import type { AnswerMap, AnswerValue } from "@/types/session";

/**
 * API de correction. Les clés de correction ne quittent JAMAIS le serveur :
 * seul le SessionScore agrégé (points par Teil/section) redescend.
 *
 * SÉCURITÉ (faille F2) — cette route était OUVERTE : sans authentification,
 * elle acceptait un examId et une carte de réponses arbitraires et renvoyait
 * le score. C'était un ORACLE sur le corrigé : en faisant varier une réponse
 * à la fois, n'importe qui pouvait extraire les clés de n'importe quel examen
 * sans même posséder de compte.
 *
 * Le contrat a donc changé : le client n'envoie plus qu'un `sessionId`.
 * Tout le reste est relu côté serveur —
 *  - l'utilisateur vient de la session d'authentification ;
 *  - la session doit lui APPARTENIR (sinon 404 : on ne révèle pas son
 *    existence, comme dans /api/sessions/[sessionId]) ;
 *  - l'examen est celui de la session en base, jamais un examId du client ;
 *  - les réponses corrigées sont celles PERSISTÉES (table Answer), jamais
 *    celles du corps de la requête.
 * Le client doit donc avoir flushé son autosave avant d'appeler (ce que fait
 * déjà AbgabeView).
 */

const payloadSchema = z.object({ sessionId: z.string().min(1) });

export async function POST(request: Request) {
  const authSession = await auth();
  const userId = authSession?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const row = await db.examSession.findUnique({
    where: { id: parsed.data.sessionId },
    select: {
      userId: true,
      examId: true,
      status: true,
      startedAt: true,
      exam: { select: { level: true } },
      answers: { select: { questionId: true, value: true } },
    },
  });
  // Session inconnue OU appartenant à quelqu'un d'autre : même réponse.
  if (!row || row.userId !== userId) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  // État autorisant la correction : l'épreuve doit avoir commencé. Une
  // session encore au test casque n'a rien à corriger.
  if (row.status === "AUDIO_CHECK" || row.startedAt === null) {
    return NextResponse.json(
      { error: "Die Prüfung wurde noch nicht begonnen.", code: "NOT_STARTED" },
      { status: 409 },
    );
  }

  const questions = await getExamScoringData(row.examId);
  if (questions.length === 0) {
    return NextResponse.json({ error: "Examen inconnu." }, { status: 404 });
  }

  // Réponses relues en base — le client n'a aucune prise dessus.
  const answers: AnswerMap = {};
  for (const answer of row.answers) {
    answers[answer.questionId] = (answer.value as AnswerValue) ?? null;
  }

  const score = scoreSession(
    answers,
    questions,
    getStructureForLevel(row.exam.level as Level),
  );
  return NextResponse.json(score);
}
