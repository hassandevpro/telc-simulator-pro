import type {
  AnswerMap,
  PersistedSessionState,
  SessionStatus,
} from "@/types/session";
import type { SessionRepository } from "./session-repository";

const NOT_AVAILABLE =
  "ApiSessionRepository : implémentation v2 (API + PostgreSQL). " +
  "Utiliser LocalStorageSessionRepository en v1.";

/**
 * Implémentation v2 du SessionRepository — API + PostgreSQL.
 * Squelette volontaire : sera implémentée lors de la bascule de persistance
 * (post-Sprint 8), sans modification des composants ni des stores.
 * Les signatures complètes sont définies par l'interface SessionRepository.
 */
export class ApiSessionRepository implements SessionRepository {
  async load(): Promise<PersistedSessionState | null> {
    throw new Error(NOT_AVAILABLE);
  }
  async listSessions(): Promise<PersistedSessionState[]> {
    throw new Error(NOT_AVAILABLE);
  }
  async save(state: PersistedSessionState): Promise<void> {
    void state;
    throw new Error(NOT_AVAILABLE);
  }
  async saveAnswers(sessionId: string, answers: AnswerMap): Promise<void> {
    void sessionId;
    void answers;
    throw new Error(NOT_AVAILABLE);
  }
  async setStatus(sessionId: string, status: SessionStatus): Promise<void> {
    void sessionId;
    void status;
    throw new Error(NOT_AVAILABLE);
  }
  async markAudioPlayed(sessionId: string, audioId: string): Promise<void> {
    void sessionId;
    void audioId;
    throw new Error(NOT_AVAILABLE);
  }
  async clear(): Promise<void> {
    throw new Error(NOT_AVAILABLE);
  }
}
