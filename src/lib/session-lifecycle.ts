import "server-only";
import { getStructureForLevel } from "@/config/exam-structure";
import { creditAccountFor } from "@/lib/center-seats";
import { db } from "@/lib/db";
import { hasExamAccess } from "@/lib/exam-access";
import { getExamScoringData } from "@/lib/exam-content";
import { scoreSession } from "@/lib/scoring/score-session";
import { sessionDurationSeconds } from "@/lib/session-server";
import type { Prisma } from "@/generated/prisma/client";
import type { Level } from "@/types/exam";
import type { SessionScore } from "@/types/scoring";
import type { AnswerMap, AnswerValue } from "@/types/session";

/**
 * Cycle de vie d'une session d'examen — SEULE autorité sur les transitions.
 *
 *   AUDIO_CHECK ──start──▶ IN_PROGRESS ──submit──▶ SCORED
 *                              │                      ▲
 *                              └─expire─▶ EXPIRED ─submit┘
 *
 * Le navigateur ne fait que DEMANDER une transition ; chacune est vérifiée
 * et exécutée ici, dans une transaction PostgreSQL :
 *  - start  : pose startedAt (heure SERVEUR) et débite 1 crédit, ensemble ;
 *             un débit impossible annule le démarrage ;
 *  - answer : accepté seulement en IN_PROGRESS et avant l'échéance ;
 *  - submit : clôt la session, corrige les réponses PERSISTÉES et écrit le
 *             résultat, une seule fois ;
 *  - expire : ferme la session, sans retour possible.
 *
 * SUBMITTED, SCORED, un résultat, un startedAt ou un submittedAt venant du
 * client ne sont jamais acceptés.
 */

/**
 * Marge réseau après l'échéance : une sauvegarde partie dans la dernière
 * seconde peut arriver un peu après. Elle ne prolonge pas l'épreuve affichée.
 */
export const ANSWER_GRACE_MS = 60_000;

type Tx = Prisma.TransactionClient;

export interface LifecycleError {
  ok: false;
  status: number;
  code: string;
  error: string;
}

const fail = (status: number, code: string, error: string): LifecycleError => ({
  ok: false,
  status,
  code,
  error,
});

const NOT_FOUND = () => fail(404, "NOT_FOUND", "Nicht gefunden.");

/** Échéance d'écriture (ms epoch) d'une session démarrée. */
export function answerDeadline(startedAt: Date, level: string): number {
  return (
    startedAt.getTime() +
    sessionDurationSeconds(level as Level) * 1000 +
    ANSWER_GRACE_MS
  );
}

/** La session démarrée a-t-elle dépassé son échéance ? */
export function isOverdue(
  row: { startedAt: Date | null; exam: { level: string } },
  now: number = Date.now(),
): boolean {
  return row.startedAt !== null && now > answerDeadline(row.startedAt, row.exam.level);
}

/**
 * Ferme une session IN_PROGRESS dont l'échéance est passée (expiration
 * paresseuse : le serveur n'a pas de minuteur, il constate à la lecture).
 * Renvoie le statut effectif.
 */
export async function expireIfOverdue(row: {
  id: string;
  status: string;
  startedAt: Date | null;
  exam: { level: string };
}): Promise<string> {
  if (row.status !== "IN_PROGRESS" || !isOverdue(row)) return row.status;
  await db.examSession.updateMany({
    where: { id: row.id, status: "IN_PROGRESS" },
    data: { status: "EXPIRED" },
  });
  return "EXPIRED";
}

/* ─────────────────────────────── Démarrage ─────────────────────────────── */

class NoCreditsError extends Error {}

export type StartResult = { ok: true; alreadyStarted: boolean } | LifecycleError;

/**
 * Démarre l'épreuve : AUDIO_CHECK → IN_PROGRESS, startedAt = maintenant
 * (serveur), et débit d'UN crédit dans la MÊME transaction.
 *
 * Concurrence :
 *  - deux démarrages de la même session : le second attend le verrou de
 *    ligne posé par l'UPDATE conditionnel du premier, puis ne trouve plus de
 *    ligne AUDIO_CHECK et ne débite rien ;
 *  - deux sessions démarrées en même temps avec un seul crédit : le débit
 *    `credits > 0` est un UPDATE conditionnel sous verrou ; le second voit 0,
 *    échoue, et SON démarrage est annulé avec la transaction.
 */
export async function startSession(
  sessionId: string,
  userId: string,
): Promise<StartResult> {
  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, examId: true, status: true, startedAt: true },
  });
  if (!row || row.userId !== userId) return NOT_FOUND();
  if (row.startedAt !== null && row.status === "IN_PROGRESS") {
    return { ok: true, alreadyStarted: true };
  }
  // Session close (EXPIRED, SCORED…) : jamais de retour à l'état actif.
  if (row.startedAt !== null || row.status !== "AUDIO_CHECK") {
    return fail(409, "INVALID_TRANSITION", "Diese Prüfung kann nicht mehr gestartet werden.");
  }

  // Le droit se vérifie à l'ENTRÉE : un plan expiré entre la création de la
  // session et le test casque ne donne pas accès à l'épreuve.
  if (!(await hasExamAccess(userId, row.examId))) {
    return fail(403, "PLAN_REQUIRED", "Für diesen Modelltest ist ein kostenpflichtiger Plan nötig.");
  }

  try {
    return await db.$transaction(async (tx) => {
      const claimed = await tx.examSession.updateMany({
        where: { id: sessionId, userId, status: "AUDIO_CHECK", startedAt: null },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
      // Démarrée par une requête concurrente, qui a géré le crédit.
      if (claimed.count === 0) return { ok: true as const, alreadyStarted: true };

      const charge = await decideCharge(tx, userId, row.examId, sessionId);
      if (charge.kind === "charge") {
        const debited = await tx.user.updateMany({
          where: { id: charge.accountId, credits: { gt: 0 } },
          data: { credits: { decrement: 1 } },
        });
        if (debited.count === 0) throw new NoCreditsError();
      }
      await tx.examSession.update({
        where: { id: sessionId },
        data: {
          creditStatus: charge.kind === "charge" ? "CHARGED" : "EXEMPT",
          // Compte débité : c'est lui qu'un remboursement manuel recrédite.
          creditAccountId: charge.kind === "charge" ? charge.accountId : null,
        },
      });
      return { ok: true as const, alreadyStarted: false };
    });
  } catch (cause) {
    if (cause instanceof NoCreditsError) {
      return fail(402, "NO_CREDITS", "Keine Credits mehr. Bitte Abo verlängern oder upgraden.");
    }
    throw cause;
  }
}

type Charge = { kind: "exempt" } | { kind: "charge"; accountId: string };

/**
 * Règles métier inchangées : SUPER_ADMIN exempté ; rejouer un examen déjà
 * terminé est gratuit ; un membre de centre (siège actif) consomme le pool
 * du propriétaire.
 */
async function decideCharge(
  tx: Tx | typeof db,
  userId: string,
  examId: string,
  sessionId: string,
): Promise<Charge> {
  const me = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (me?.role === "SUPER_ADMIN") return { kind: "exempt" };

  const alreadyDone = await tx.examSession.findFirst({
    where: {
      userId,
      examId,
      status: { in: ["SUBMITTED", "SCORED"] },
      id: { not: sessionId },
    },
    select: { id: true },
  });
  if (alreadyDone) return { kind: "exempt" };

  return { kind: "charge", accountId: await creditAccountFor(tx, userId) };
}

/**
 * Ce que coûtera le démarrage, pour le LUI DIRE avant : même décision que le
 * débit réel (decideCharge), sans rien écrire. Affiché dans la confirmation
 * du test casque — le débit, lui, reste décidé par startSession.
 */
export async function previewCreditCharge(
  userId: string,
  sessionId: string,
  examId: string,
): Promise<{ charge: boolean; balance: number }> {
  const charge = await decideCharge(db, userId, examId, sessionId);
  const accountId = charge.kind === "charge" ? charge.accountId : await creditAccountFor(db, userId);
  const account = await db.user.findUnique({
    where: { id: accountId },
    select: { credits: true },
  });
  return { charge: charge.kind === "charge", balance: account?.credits ?? 0 };
}

/* ──────────────────────────────── Réponses ─────────────────────────────── */

export type SaveAnswersResult =
  | { ok: true; saved: number; rejected: string[] }
  | LifecycleError;

/**
 * Enregistre des réponses. Tout ou rien : si une écriture échoue, AUCUNE
 * n'est conservée et l'erreur remonte (l'appelant répond 5xx, le client
 * réessaie) — on ne prétend jamais avoir sauvegardé ce qui ne l'est pas.
 *
 * La transaction verrouille d'abord la session par un UPDATE conditionnel
 * (IN_PROGRESS et échéance non dépassée) : une remise concurrente attend la
 * fin de cette écriture, et une écriture arrivée après la remise ne trouve
 * plus la session ouverte. Les réponses sont donc figées à la remise.
 *
 * Les identifiants de question qui n'appartiennent pas à l'examen de la
 * session (contenu réédité, payload forgé) sont ignorés et renvoyés dans
 * `rejected`.
 */
export async function saveSessionAnswers(
  sessionId: string,
  userId: string,
  answers: AnswerMap,
): Promise<SaveAnswersResult> {
  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    select: {
      id: true,
      userId: true,
      examId: true,
      status: true,
      startedAt: true,
      exam: { select: { level: true } },
    },
  });
  if (!row || row.userId !== userId) return NOT_FOUND();

  const locked = await rejectIfLocked(row);
  if (locked) return locked;

  const ids = Object.keys(answers);
  if (ids.length === 0) return { ok: true, saved: 0, rejected: [] };

  const known = await db.question.findMany({
    where: { id: { in: ids }, part: { examId: row.examId } },
    select: { id: true },
  });
  const knownIds = new Set(known.map((question) => question.id));
  const rejected = ids.filter((id) => !knownIds.has(id));

  // Échéance minimale : startedAt doit être postérieur à ce seuil.
  const durationMs = sessionDurationSeconds(row.exam.level as Level) * 1000;
  const startedAfter = new Date(Date.now() - durationMs - ANSWER_GRACE_MS);

  const outcome = await db.$transaction(async (tx) => {
    const open = await tx.examSession.updateMany({
      where: {
        id: sessionId,
        userId,
        status: "IN_PROGRESS",
        startedAt: { gte: startedAfter },
      },
      data: { status: "IN_PROGRESS" },
    });
    if (open.count === 0) return "LOCKED" as const;

    for (const questionId of knownIds) {
      const value = answers[questionId] as AnswerValue;
      if (value === null) {
        await tx.answer.deleteMany({ where: { sessionId, questionId } });
      } else {
        await tx.answer.upsert({
          where: { sessionId_questionId: { sessionId, questionId } },
          create: { sessionId, questionId, value },
          update: { value },
        });
      }
    }
    return "SAVED" as const;
  });

  if (outcome === "LOCKED") {
    // L'état a changé entre la lecture et le verrou (remise, expiration).
    const fresh = await db.examSession.findUnique({
      where: { id: sessionId },
      select: { id: true, status: true, startedAt: true, exam: { select: { level: true } } },
    });
    return (fresh && (await rejectIfLocked(fresh))) ??
      fail(409, "SESSION_LOCKED", "Die Prüfung ist abgeschlossen. Antworten können nicht mehr geändert werden.");
  }
  return { ok: true, saved: knownIds.size, rejected };
}

async function rejectIfLocked(row: {
  id: string;
  status: string;
  startedAt: Date | null;
  exam: { level: string };
}): Promise<LifecycleError | null> {
  const status = await expireIfOverdue(row);
  if (status === "EXPIRED") {
    return fail(409, "SESSION_EXPIRED", "Die Prüfungszeit ist abgelaufen.");
  }
  if (status !== "IN_PROGRESS" || row.startedAt === null) {
    return fail(
      409,
      "SESSION_LOCKED",
      "Die Prüfung ist nicht geöffnet. Antworten können nicht geändert werden.",
    );
  }
  return null;
}

/* ─────────────────────────────── Expiration ────────────────────────────── */

/** IN_PROGRESS → EXPIRED (fermeture volontaire ou fin du chrono). Irréversible. */
export async function expireSession(
  sessionId: string,
  userId: string,
): Promise<{ ok: true } | LifecycleError> {
  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, status: true },
  });
  if (!row || row.userId !== userId) return NOT_FOUND();
  if (row.status === "EXPIRED") return { ok: true };
  const closed = await db.examSession.updateMany({
    where: { id: sessionId, status: "IN_PROGRESS" },
    data: { status: "EXPIRED" },
  });
  if (closed.count === 0) {
    return fail(409, "INVALID_TRANSITION", "Diese Prüfung ist nicht geöffnet.");
  }
  return { ok: true };
}

/* ───────────────────────────────── Remise ──────────────────────────────── */

export type SubmitResult = { ok: true; score: SessionScore } | LifecycleError;

/**
 * Remise DÉFINITIVE et correction, en une transaction :
 *  1. IN_PROGRESS / EXPIRED (ou SUBMITTED historique) → SCORED, par UPDATE
 *     conditionnel : une seule remise peut gagner, les suivantes relisent
 *     le résultat déjà écrit (idempotence) ;
 *  2. correction des réponses PERSISTÉES, contre les clés serveur ;
 *  3. écriture du résultat par le serveur.
 * Une session historique (démarrée avant le débit au démarrage) subit ici
 * l'ancien débit à la remise, pour ne pas devenir gratuite.
 */
export async function submitSession(
  sessionId: string,
  userId: string,
): Promise<SubmitResult> {
  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    select: {
      userId: true,
      examId: true,
      status: true,
      startedAt: true,
      submittedAt: true,
      creditStatus: true,
      exam: { select: { level: true } },
      result: { select: { sectionScores: true } },
    },
  });
  if (!row || row.userId !== userId) return NOT_FOUND();
  if (row.status === "SCORED" && row.result) {
    return { ok: true, score: row.result.sectionScores as unknown as SessionScore };
  }
  if (row.status === "AUDIO_CHECK" || row.startedAt === null) {
    return fail(409, "NOT_STARTED", "Die Prüfung wurde noch nicht begonnen.");
  }

  // Chargé hors transaction : lecture seule, potentiellement volumineuse.
  const questions = await getExamScoringData(row.examId);
  if (questions.length === 0) return fail(404, "EXAM_UNKNOWN", "Examen inconnu.");
  const structure = getStructureForLevel(row.exam.level as Level);

  const score = await db.$transaction(async (tx) => {
    const claimed = await tx.examSession.updateMany({
      where: {
        id: sessionId,
        userId,
        status: { in: ["IN_PROGRESS", "EXPIRED", "SUBMITTED", "SCORED"] },
        result: { is: null },
      },
      data: { status: "SCORED", submittedAt: row.submittedAt ?? new Date() },
    });
    if (claimed.count === 0) {
      // Une remise concurrente a gagné : on relit son résultat.
      const existing = await tx.result.findUnique({
        where: { sessionId },
        select: { sectionScores: true },
      });
      return existing ? (existing.sectionScores as unknown as SessionScore) : null;
    }

    if (row.creditStatus === null) {
      const accountId = await creditAccountFor(tx, userId);
      await tx.user.updateMany({
        where: { id: accountId, credits: { gt: 0 } },
        data: { credits: { decrement: 1 } },
      });
      await tx.examSession.update({
        where: { id: sessionId },
        data: { creditStatus: "CHARGED_AT_SUBMIT", creditAccountId: accountId },
      });
    }

    const stored = await tx.answer.findMany({
      where: { sessionId },
      select: { questionId: true, value: true },
    });
    const answers: AnswerMap = {};
    for (const answer of stored) {
      answers[answer.questionId] = (answer.value as AnswerValue) ?? null;
    }
    const computed = scoreSession(answers, questions, structure);
    const json = computed as unknown as Prisma.InputJsonValue;
    await tx.result.upsert({
      where: { sessionId },
      create: {
        sessionId,
        totalPoints: computed.objectivePoints,
        maxPoints: computed.writtenMaxPoints,
        sectionScores: json,
        passed: null,
      },
      update: {
        totalPoints: computed.objectivePoints,
        maxPoints: computed.writtenMaxPoints,
        sectionScores: json,
      },
    });
    return computed;
  });

  if (!score) return fail(409, "RETRY", "Abgabe läuft bereits. Bitte erneut versuchen.");
  return { ok: true, score };
}
