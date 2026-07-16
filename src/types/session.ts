import type { SessionScore } from "@/types/scoring";

/**
 * Types du domaine — état d'une session d'examen côté client.
 */

export type SessionStatus =
  | "AUDIO_CHECK" // test casque obligatoire non validé
  | "IN_PROGRESS"
  | "SUBMITTED"
  | "EXPIRED"
  | "SCORED";

/**
 * Valeur d'une réponse candidat.
 * - dropdown / QCM : identifiant de l'option choisie ("a", "titre-3", "X"…)
 * - Schreiben : texte libre
 * - null : non répondu
 */
export type AnswerValue = string | null;

/** Réponses indexées par identifiant de question. */
export type AnswerMap = Record<string, AnswerValue>;

/**
 * Forme persistée d'une session (LocalStorage v1, API/PostgreSQL v2).
 * C'est le contrat du SessionRepository — les composants ne connaissent
 * jamais l'implémentation de stockage.
 */
export interface PersistedSessionState {
  sessionId: string;
  /**
   * Propriétaire de la session (id du candidat connecté). Le stockage v1
   * étant partagé par navigateur, ce champ CLOISONNE l'affichage : la liste
   * « Ihre Sitzungen » ne montre que les sessions de l'utilisateur courant —
   * indispensable sur les postes partagés des centres d'examen. Optionnel
   * pour compatibilité avec les sessions créées avant ce cloisonnement
   * (elles n'appartiennent à personne et ne sont donc listées pour personne).
   */
  ownerKey?: string;
  examId: string;
  status: SessionStatus;
  /** Posé à la remise (ou à l'expiration validée). */
  submittedAt?: number | null;
  /** Résultat calculé par l'API de correction — présent une fois SCORED. */
  result?: SessionScore | null;
  /**
   * Ancre du timer (epoch ms). Posée UNE SEULE FOIS à l'entrée en session,
   * jamais modifiée ensuite : le temps restant est toujours calculé,
   * jamais décrémenté (ARCHITECTURE.md §6).
   */
  startedAt: number | null;
  durationSeconds: number;
  answers: AnswerMap;
  /** Audios déjà consommés — marqués dès l'événement `play`, pas `ended`. */
  playedAudioIds: string[];
  updatedAt: number;
}
