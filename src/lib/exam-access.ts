import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getEffectivePlanForUser } from "@/lib/billing";
import { planIncludesFullCatalog } from "@/config/plans";
import { DEMO_B2_CONTENT } from "@/lib/demo-b2-content";
import { DEMO_IMPORT_TITLE } from "@/lib/exam-content";

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

/**
 * Garde des pages et Route Handlers d'examen : résout l'examen d'une session
 * ET vérifie le droit d'y accéder, en une seule opération.
 *
 * Renvoie null (l'appelant répond 404 / notFound, sans révéler l'existence
 * de la session) si l'une de ces conditions n'est pas remplie :
 *  - utilisateur authentifié ;
 *  - session existante APPARTENANT à cet utilisateur ;
 *  - droit d'accès à l'examen associé à cette session.
 *
 * EXCEPTION VOLONTAIRE — épreuve en cours : si le chrono est lancé et la
 * session encore ouverte, l'accès est maintenu même sans droit courant. Le
 * droit se vérifie à l'ENTRÉE, jamais pendant : une expiration d'abonnement
 * au milieu d'un passage ne doit pas faire perdre sa copie au candidat
 * (l'entrée, elle, est verrouillée par POST /api/sessions).
 */
export async function requireSessionExam(
  sessionId: string,
): Promise<SessionExamAccess | null> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;

  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, examId: true, startedAt: true, status: true },
  });
  if (!row || row.userId !== userId) return null;

  const inFlight = row.startedAt !== null && row.status === "IN_PROGRESS";
  if (inFlight) return { userId, examId: row.examId };

  if (!(await hasExamAccess(userId, row.examId))) return null;
  return { userId, examId: row.examId };
}
