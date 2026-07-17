import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { resolveDbExamId } from "@/lib/exam-content";
import { buildSessionState } from "@/lib/session-server";
import { Prisma } from "@/generated/prisma/client";

/**
 * API sessions (v2 — persistance PostgreSQL, cloisonnée par utilisateur).
 * Toutes les routes exigent une session d'authentification et n'exposent
 * que les ExamSession de l'utilisateur courant.
 */

/** Historique des sessions du candidat connecté (sans les réponses). */
export async function GET() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const rows = await db.examSession.findMany({
    where: { userId },
    include: {
      exam: { select: { level: true } },
      result: { select: { sectionScores: true, createdAt: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const states = rows
    .map((row) => buildSessionState(row))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return NextResponse.json(states);
}

const answerValueSchema = z.string().nullable();

const saveSchema = z.object({
  sessionId: z.string().min(1),
  examId: z.string().min(1),
  status: z.enum([
    "AUDIO_CHECK",
    "IN_PROGRESS",
    "SUBMITTED",
    "EXPIRED",
    "SCORED",
  ]),
  startedAt: z.number().nullable().optional(),
  submittedAt: z.number().nullable().optional(),
  answers: z.record(z.string(), answerValueSchema).optional(),
  playedAudioIds: z.array(z.string()).optional(),
  // Le résultat est une structure riche (SessionScore) rangée telle quelle.
  result: z.unknown().optional(),
});

/**
 * Création ou mise à jour de l'état d'une session (save du repository).
 * L'ancre `startedAt` est INVIOLABLE : une fois posée en base, une requête
 * ultérieure ne peut plus la déplacer (fondement du timer, ARCHITECTURE §6).
 * Le propriétaire (userId) vient de l'authentification, jamais du client.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const parsed = saveSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }
  const state = parsed.data;

  // L'examId doit exister en base (la démo par défaut est aliasée vers son
  // import éditable). ExamSession.examId a une clé étrangère vers Exam.
  const examId = await resolveDbExamId(state.examId);
  const exam = await db.exam.findUnique({ where: { id: examId } });
  if (!exam) {
    return NextResponse.json({ error: "Examen inconnu." }, { status: 400 });
  }

  const existing = await db.examSession.findUnique({
    where: { id: state.sessionId },
    select: { userId: true, startedAt: true, submittedAt: true, status: true },
  });
  if (existing && existing.userId !== userId) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  const incomingStarted =
    typeof state.startedAt === "number" ? new Date(state.startedAt) : null;
  const incomingSubmitted =
    typeof state.submittedAt === "number" ? new Date(state.submittedAt) : null;

  // ── Anti-partage (crédits) ──
  // Verrou au DÉMARRAGE : impossible d'entrer dans l'épreuve à 0 crédit
  //   (pose de startedAt) — mais aucun débit à ce stade.
  // Débit à la SOUMISSION : le crédit baisse quand l'examen est rendu
  //   (première entrée en SUBMITTED/SCORED).
  // Rejouer un examen déjà terminé ne fait ni verrou ni débit.
  const COMPLETED = ["SUBMITTED", "SCORED"] as const;
  const isStarting = incomingStarted !== null && !existing?.startedAt;
  const wasCompleted = existing
    ? (COMPLETED as readonly string[]).includes(existing.status)
    : false;
  const isSubmitting =
    (COMPLETED as readonly string[]).includes(state.status) && !wasCompleted;

  if (isStarting || isSubmitting) {
    const me = await db.user.findUnique({
      where: { id: userId },
      select: { role: true, centerId: true, center: { select: { ownerId: true } } },
    });
    // SUPER_ADMIN exempté (tests). Un étudiant de centre consomme le pool du
    // propriétaire du centre ; sinon son propre solde.
    if (me?.role !== "SUPER_ADMIN") {
      // « Déjà fait » : une session terminée sur CET examen l'a déjà débloqué
      // — le rejouer ne coûte rien (ni verrou, ni débit).
      const alreadyDone = await db.examSession.findFirst({
        where: {
          userId,
          examId,
          status: { in: ["SUBMITTED", "SCORED"] },
          id: { not: state.sessionId },
        },
        select: { id: true },
      });
      if (!alreadyDone) {
        const accountId =
          me?.centerId && me.center?.ownerId ? me.center.ownerId : userId;

        if (isStarting) {
          // Verrou d'entrée : au moins 1 crédit requis, sans débiter.
          const acct = await db.user.findUnique({
            where: { id: accountId },
            select: { credits: true },
          });
          if ((acct?.credits ?? 0) <= 0) {
            return NextResponse.json(
              {
                error: "Keine Credits mehr. Bitte Abo verlängern oder upgraden.",
                code: "NO_CREDITS",
              },
              { status: 402 },
            );
          }
        }

        if (isSubmitting) {
          // Débit d'UN crédit à la remise de l'examen (clampé à 0).
          await db.user.updateMany({
            where: { id: accountId, credits: { gt: 0 } },
            data: { credits: { decrement: 1 } },
          });
        }
      }
    }
  }

  await db.examSession.upsert({
    where: { id: state.sessionId },
    create: {
      id: state.sessionId,
      userId,
      examId,
      status: state.status,
      startedAt: incomingStarted,
      submittedAt: incomingSubmitted,
      audioPlayed: (state.playedAudioIds ?? []) as Prisma.InputJsonValue,
    },
    update: {
      status: state.status,
      // startedAt/submittedAt ne sont posés qu'une seule fois.
      startedAt: existing?.startedAt ?? incomingStarted,
      submittedAt: existing?.submittedAt ?? incomingSubmitted,
      // N'écrase la liste audio QUE si le client l'a fournie — évite
      // qu'un save partiel efface les audios déjà consommés.
      ...(state.playedAudioIds !== undefined
        ? {
            audioPlayed: state.playedAudioIds as Prisma.InputJsonValue,
          }
        : {}),
    },
  });

  // Réponses : fusion idempotente (les null suppriment la réponse).
  const answers = state.answers ?? {};
  for (const [questionId, value] of Object.entries(answers)) {
    if (value === null) {
      await db.answer
        .delete({ where: { sessionId_questionId: { sessionId: state.sessionId, questionId } } })
        .catch(() => undefined);
      continue;
    }
    // .catch : une questionId périmée (contenu réédité) ne doit pas faire
    // échouer l'enregistrement de toute la session.
    const jsonValue = value as Prisma.InputJsonValue;
    await db.answer
      .upsert({
        where: { sessionId_questionId: { sessionId: state.sessionId, questionId } },
        create: { sessionId: state.sessionId, questionId, value: jsonValue },
        update: { value: jsonValue },
      })
      .catch(() => undefined);
  }

  // Résultat : présent une fois la session corrigée (SCORED).
  if (state.result && typeof state.result === "object") {
    const score = state.result as {
      objectivePoints?: number;
      writtenMaxPoints?: number;
    };
    await db.result.upsert({
      where: { sessionId: state.sessionId },
      create: {
        sessionId: state.sessionId,
        totalPoints: score.objectivePoints ?? 0,
        maxPoints: score.writtenMaxPoints ?? 0,
        sectionScores: state.result as Prisma.InputJsonValue,
        passed: null,
      },
      update: {
        totalPoints: score.objectivePoints ?? 0,
        maxPoints: score.writtenMaxPoints ?? 0,
        sectionScores: state.result as Prisma.InputJsonValue,
      },
    });
  }

  return NextResponse.json({ ok: true });
}
