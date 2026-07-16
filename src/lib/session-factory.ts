import type { ExamStructure } from "@/types/exam";
import type { PersistedSessionState } from "@/types/session";

/**
 * État initial d'une session d'examen — utilisé par le bootstrap
 * (ExamShell) et par le test audio (AudioCheck).
 * La session naît en AUDIO_CHECK, SANS ancre de timer : `startedAt` est
 * posé une seule fois, à la validation du test casque — le chronomètre
 * ne démarre qu'à l'entrée réelle dans l'épreuve, comme au centre.
 * Sprint 9 : l'examId réel viendra de la création de session au dashboard.
 */
export function createInitialSessionState(
  sessionId: string,
  structure: ExamStructure,
  examId = "demo-b2",
): PersistedSessionState {
  return {
    sessionId,
    examId,
    status: "AUDIO_CHECK",
    startedAt: null,
    durationSeconds: structure.schriftlichePruefung.durationMinutes * 60,
    answers: {},
    playedAudioIds: [],
    updatedAt: Date.now(),
  };
}
