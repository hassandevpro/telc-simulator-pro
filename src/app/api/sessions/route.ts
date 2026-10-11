import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasExamAccess } from "@/lib/exam-access";
import { resolveDbExamId } from "@/lib/exam-content";
import { buildSessionState } from "@/lib/session-server";
import {
  expireIfOverdue,
  expireSession,
  saveSessionAnswers,
  startSession,
  type LifecycleError,
} from "@/lib/session-lifecycle";
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

  // Expiration paresseuse : une session dont l'échéance est passée est
  // fermée côté serveur avant d'être renvoyée.
  for (const row of rows) {
    row.status = (await expireIfOverdue(row)) as typeof row.status;
  }

  const states = rows
    .map((row) => buildSessionState(row))
    .sort((a, b) => b.updatedAt - a.updatedAt);
  return NextResponse.json(states);
}

const answerValueSchema = z.string().max(20_000).nullable();

/**
 * Forme historique du save du repository, conservée pour compatibilité.
 * `result`, `submittedAt` et `startedAt` sont encore ACCEPTÉS dans le
 * payload (anciens clients) mais IGNORÉS : le serveur ne prend du client que
 * l'intention (créer, démarrer, fermer), jamais une valeur d'autorité.
 */
const saveSchema = z.object({
  sessionId: z.string().min(1).max(64),
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
  playedAudioIds: z.array(z.string().max(200)).max(50).optional(),
  result: z.unknown().optional(),
});

function lifecycleError(result: LifecycleError) {
  return NextResponse.json(
    { error: result.error, code: result.code },
    { status: result.status },
  );
}

/**
 * Création d'une session, et transitions DEMANDÉES par le client.
 *
 * Transitions acceptées (toute autre → 409 INVALID_TRANSITION) :
 *   - création en AUDIO_CHECK (gating du plan) ;
 *   - AUDIO_CHECK → IN_PROGRESS : démarrage + débit atomique du crédit
 *     (lib/session-lifecycle.ts) ; startedAt = heure SERVEUR ;
 *   - IN_PROGRESS → EXPIRED.
 * SUBMITTED/SCORED passent exclusivement par POST /api/sessions/{id}/submit.
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

  let existing = await db.examSession.findUnique({
    where: { id: state.sessionId },
    select: { userId: true, status: true, startedAt: true },
  });
  if (existing && existing.userId !== userId) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  if (!existing) {
    // L'examId doit exister en base (la démo par défaut est aliasée vers son
    // import éditable). ExamSession.examId a une clé étrangère vers Exam.
    const examId = await resolveDbExamId(state.examId);
    const exam = await db.exam.findUnique({ where: { id: examId } });
    if (!exam) {
      return NextResponse.json({ error: "Examen inconnu." }, { status: 400 });
    }
    // Gating payant (F1) à la création — revérifié au démarrage.
    if (!(await hasExamAccess(userId, examId))) {
      return NextResponse.json(
        {
          error: "Für diesen Modelltest ist ein kostenpflichtiger Plan nötig.",
          code: "PLAN_REQUIRED",
        },
        { status: 403 },
      );
    }
    try {
      await db.examSession.create({
        data: { id: state.sessionId, userId, examId, status: "AUDIO_CHECK" },
      });
    } catch {
      // Création concurrente du même identifiant.
      return NextResponse.json({ error: "Zugriff verweigert." }, { status: 409 });
    }
    existing = { userId, status: "AUDIO_CHECK", startedAt: null };
  }

  // ── Transition demandée ──
  const wantsStart =
    existing.status === "AUDIO_CHECK" &&
    (state.status === "IN_PROGRESS" || typeof state.startedAt === "number");

  if (wantsStart) {
    const started = await startSession(state.sessionId, userId);
    if (!started.ok) return lifecycleError(started);
  } else if (state.status !== existing.status) {
    if (existing.status === "IN_PROGRESS" && state.status === "EXPIRED") {
      const expired = await expireSession(state.sessionId, userId);
      if (!expired.ok) return lifecycleError(expired);
    } else {
      return NextResponse.json(
        {
          error:
            state.status === "SUBMITTED" || state.status === "SCORED"
              ? "Abgabe nur über die Abgabe-Funktion möglich."
              : "Statuswechsel nicht erlaubt.",
          code: "INVALID_TRANSITION",
        },
        { status: 409 },
      );
    }
  }

  // Audios consommés : UNION (jamais d'effacement) — un save partiel ou
  // forgé ne peut pas « rendre » un audio déjà écouté.
  if (state.playedAudioIds && state.playedAudioIds.length > 0) {
    await mergePlayedAudio(state.sessionId, state.playedAudioIds);
  }

  // Réponses : mêmes règles que l'autosave (épreuve ouverte, avant échéance).
  const answers = state.answers ?? {};
  if (Object.keys(answers).length > 0) {
    const saved = await saveSessionAnswers(state.sessionId, userId, answers);
    if (!saved.ok) return lifecycleError(saved);
  }

  return NextResponse.json({ ok: true });
}

async function mergePlayedAudio(sessionId: string, ids: string[]) {
  const current = await db.examSession.findUnique({
    where: { id: sessionId },
    select: { audioPlayed: true },
  });
  const played = Array.isArray(current?.audioPlayed)
    ? (current.audioPlayed as string[])
    : [];
  const merged = Array.from(new Set([...played, ...ids]));
  if (merged.length !== played.length) {
    await db.examSession.update({
      where: { id: sessionId },
      data: { audioPlayed: merged as Prisma.InputJsonValue },
    });
  }
}
