import "server-only";
import { getStructureForLevel } from "@/config/exam-structure";
import type { Level } from "@/types/exam";
import type { SessionScore } from "@/types/scoring";
import type {
  AnswerValue,
  PersistedSessionState,
  SessionStatus,
} from "@/types/session";

/**
 * Persistance serveur des sessions (v2) — mapping entre les tables
 * PostgreSQL (ExamSession + Answer + Result) et la forme d'échange
 * `PersistedSessionState` consommée par le client via l'API.
 *
 * Choix assumés (aucune migration de schéma requise) :
 *  - `durationSeconds` est DÉRIVÉ du niveau de l'examen (structure officielle),
 *    jamais stocké — une seule source de vérité.
 *  - le `SessionScore` complet est rangé dans `Result.sectionScores` (JSON) ;
 *    les colonnes scalaires (totalPoints…) restent un résumé requêtable.
 *  - `updatedAt` est calculé (max des horodatages connus), suffisant pour
 *    trier et dater l'historique.
 */

/** Durée de l'épreuve écrite en secondes, selon le niveau. */
export function sessionDurationSeconds(level: Level): number {
  return getStructureForLevel(level).schriftlichePruefung.durationMinutes * 60;
}

export interface SessionRowForState {
  id: string;
  userId: string;
  examId: string;
  status: SessionStatus;
  startedAt: Date | null;
  submittedAt: Date | null;
  audioPlayed: unknown;
  createdAt: Date;
  exam: { level: string };
  answers?: { questionId: string; value: unknown; updatedAt: Date }[];
  result?: { sectionScores: unknown; createdAt: Date } | null;
}

function toAnswerMap(
  rows: { questionId: string; value: unknown }[] | undefined,
): Record<string, AnswerValue> {
  const map: Record<string, AnswerValue> = {};
  for (const row of rows ?? []) {
    map[row.questionId] = (row.value as AnswerValue) ?? null;
  }
  return map;
}

function computeUpdatedAt(row: SessionRowForState): number {
  const stamps = [
    row.createdAt.getTime(),
    row.startedAt?.getTime() ?? 0,
    row.submittedAt?.getTime() ?? 0,
    row.result?.createdAt.getTime() ?? 0,
    ...(row.answers ?? []).map((a) => a.updatedAt.getTime()),
  ];
  return Math.max(...stamps);
}

/**
 * Construit l'état d'échange à partir d'une ligne ExamSession.
 * `includeAnswers` = false pour l'historique (liste) : on n'expédie pas
 * toutes les réponses, seuls le statut, la date et le résultat sont lus.
 */
export function buildSessionState(
  row: SessionRowForState,
): PersistedSessionState {
  return {
    sessionId: row.id,
    ownerKey: row.userId,
    examId: row.examId,
    status: row.status,
    submittedAt: row.submittedAt?.getTime() ?? null,
    result: (row.result?.sectionScores as SessionScore | null) ?? null,
    startedAt: row.startedAt?.getTime() ?? null,
    durationSeconds: sessionDurationSeconds(row.exam.level as Level),
    answers: toAnswerMap(row.answers),
    playedAudioIds: Array.isArray(row.audioPlayed)
      ? (row.audioPlayed as string[])
      : [],
    updatedAt: computeUpdatedAt(row),
  };
}
