import type {
  AnswerMap,
  PersistedSessionState,
  SessionStatus,
} from "@/types/session";

/**
 * Contrat de persistance d'une session d'examen (ARCHITECTURE.md §1.4).
 * Les stores et hooks dépendent UNIQUEMENT de cette interface :
 *  - v1 : LocalStorageSessionRepository (ce sprint)
 *  - v2 : ApiSessionRepository (API + PostgreSQL) — bascule sans toucher
 *    aux composants.
 * Toutes les méthodes sont asynchrones dès la v1 pour que la signature
 * ne change pas en v2.
 */
export interface SessionRepository {
  load(sessionId: string): Promise<PersistedSessionState | null>;

  /** Toutes les sessions du candidat (historique des résultats). */
  listSessions(): Promise<PersistedSessionState[]>;

  /** Crée ou remplace l'état complet d'une session. */
  save(state: PersistedSessionState): Promise<void>;

  /** Autosave : fusionne les réponses fournies (upsert idempotent). */
  saveAnswers(sessionId: string, answers: AnswerMap): Promise<void>;

  setStatus(sessionId: string, status: SessionStatus): Promise<void>;

  /**
   * Marque un audio comme consommé — appelé dès l'événement `play`,
   * jamais attendu jusqu'à `ended` (ARCHITECTURE.md §6).
   */
  markAudioPlayed(sessionId: string, audioId: string): Promise<void>;

  clear(sessionId: string): Promise<void>;
}
