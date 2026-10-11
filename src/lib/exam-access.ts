import "server-only";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectivePlanForUser } from "@/lib/billing";
import { planIncludesFullCatalog } from "@/config/plans";
import { DEMO_B2_CONTENT } from "@/lib/demo-b2-content";
import { DEMO_IMPORT_TITLE } from "@/lib/exam-content";
import { sessionDurationSeconds } from "@/lib/session-server";
import type { Level } from "@/types/exam";

/**
 * GARDE D'ACCÈS AUX EXAMENS — autorité unique et exclusivement serveur.
 *
 * Avant ce module, le gating payant n'existait qu'au LISTING du catalogue
 * (listAvailableExams) : rien ne protégeait l'entrée dans une épreuve. Un
 * compte FREE pouvait atteindre le contenu payant de deux façons —
 *  1. POST /api/sessions avec l'examId de son choix (seule l'EXISTENCE de
 *     l'examen était vérifiée) ;
 *  2. en posant lui-même le cookie `telc-exam-{sessionId}`, que la
 *     résolution serveur de l'examen d'une session acceptait en repli.
 *
 * Règle désormais appliquée : l'examen d'une session vient UNIQUEMENT de la
 * ligne ExamSession en base, et l'accès est recalculé côté serveur. Ne sont
 * jamais des sources d'autorité : le cookie, le plan annoncé par le client,
 * un examId reçu du client, le plan porté par le JWT.
 */

/**
 * Un examen est GRATUIT — accessible à tous, y compris FREE — s'il s'agit du
 * Modelltest de démonstration : la fixture codée en dur, ou sa copie
 * éditable importée en base. C'est exactement la règle qu'applique
 * listAvailableExams, reprise ici pour que la démo reste offerte.
 */
export async function isFreeExam(examId: string): Promise<boolean> {
  if (examId === DEMO_B2_CONTENT.examId) return true;
  try {
    const exam = await db.exam.findUnique({
      where: { id: examId },
      select: { title: true },
    });
    return exam?.title === DEMO_IMPORT_TITLE;
  } catch {
    // Base indisponible : on échoue FERMÉ (aucun accès payant accordé).
    return false;
  }
}

/**
 * L'utilisateur a-t-il le droit d'accéder au contenu de cet examen ?
 * Démo → toujours. Sinon → plan effectif lu en base (achat immédiat pris en
 * compte, abonnement expiré rétrogradé, cascade centre appliquée).
 */
export async function hasExamAccess(
  userId: string,
  examId: string,
): Promise<boolean> {
  if (await isFreeExam(examId)) return true;
  const plan = await getEffectivePlanForUser(userId);
  return planIncludesFullCatalog(plan);
}

export interface SessionExamAccess {
  userId: string;
  examId: string;
}

/** Résultat de la garde : accès, épreuve pas encore démarrée, ou refus. */
export type SessionExamGuard =
  | ({ kind: "ok" } & SessionExamAccess)
  | { kind: "not-started" }
  | null;

/**
 * Garde des pages d'examen : résout l'examen d'une session ET vérifie le
 * droit d'y accéder, en une seule opération.
 *
 * Renvoie null (l'appelant répond 404 / notFound, sans révéler l'existence
 * de la session) si :
 *  - l'utilisateur n'est pas authentifié ;
 *  - la session n'existe pas ou ne lui APPARTIENT pas ;
 *  - il n'a pas (ou plus) le droit d'accéder à l'examen.
 *
 * Renvoie `not-started` tant que l'épreuve n'a pas démarré : le CONTENU d'un
 * examen n'est servi qu'après le démarrage, c'est-à-dire après le débit du
 * crédit (sinon une session créée puis jamais démarrée donnerait à lire tout
 * l'examen gratuitement).
 *
 * EXCEPTION VOLONTAIRE — épreuve en cours : tant que l'échéance SERVEUR
 * n'est pas passée, l'accès est maintenu même sans droit courant (une
 * expiration d'abonnement en plein passage ne fait pas perdre la copie).
 */
export async function requireSessionExamAccess(
  sessionId: string,
): Promise<SessionExamGuard> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    select: {
      userId: true,
      examId: true,
      startedAt: true,
      status: true,
      exam: { select: { level: true } },
    },
  });
  if (!row || row.userId !== userId) return null;
  if (row.startedAt === null || row.status === "AUDIO_CHECK") {
    return { kind: "not-started" };
  }

  const durationMs = sessionDurationSeconds(row.exam.level as Level) * 1000;
  const inFlight =
    row.status === "IN_PROGRESS" &&
    Date.now() <= row.startedAt.getTime() + durationMs;
  if (inFlight) return { kind: "ok", userId, examId: row.examId };

  if (!(await hasExamAccess(userId, row.examId))) return null;
  return { kind: "ok", userId, examId: row.examId };
}

/**
 * Variante des pages : renvoie l'accès, redirige vers le test casque si
 * l'épreuve n'a pas démarré, null sinon (→ notFound).
 */
export async function requireSessionExam(
  sessionId: string,
): Promise<SessionExamAccess | null> {
  const guard = await requireSessionExamAccess(sessionId);
  if (guard?.kind === "not-started") {
    redirect(`/audio-check?session=${encodeURIComponent(sessionId)}`);
  }
  if (!guard) return null;
  return { userId: guard.userId, examId: guard.examId };
}
