import type {
  AnswerMap,
  PersistedSessionState,
  SessionStatus,
} from "@/types/session";
import type { SessionRepository } from "./session-repository";

/**
 * Implémentation v2 du SessionRepository — API + PostgreSQL.
 * Les sessions vivent en base, cloisonnées par utilisateur (userId de la
 * session d'authentification, jamais du client). Les appels sont
 * same-origin : le cookie d'auth est transmis automatiquement.
 *
 * Aucun composant ni store ne change : seule l'injection (index.ts) bascule
 * de LocalStorage vers cette classe.
 */
export class ApiSessionRepository implements SessionRepository {
  async load(sessionId: string): Promise<PersistedSessionState | null> {
    const response = await fetch(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
    );
    if (response.status === 404) return null;
    if (!response.ok) throw new Error("Sitzung nicht ladbar.");
    return (await response.json()) as PersistedSessionState;
  }

  async listSessions(): Promise<PersistedSessionState[]> {
    const response = await fetch("/api/sessions");
    if (!response.ok) return [];
    return (await response.json()) as PersistedSessionState[];
  }

  async save(state: PersistedSessionState): Promise<void> {
    const response = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
    if (!response.ok) throw new Error("Sitzung nicht speicherbar.");
  }

  async saveAnswers(sessionId: string, answers: AnswerMap): Promise<void> {
    await this.patch(sessionId, { op: "answers", answers });
  }

  async setStatus(sessionId: string, status: SessionStatus): Promise<void> {
    await this.patch(sessionId, { op: "status", status });
  }

  async markAudioPlayed(sessionId: string, audioId: string): Promise<void> {
    await this.patch(sessionId, { op: "audio", audioId });
  }

  async clear(sessionId: string): Promise<void> {
    await fetch(`/api/sessions/${encodeURIComponent(sessionId)}`, {
      method: "DELETE",
    });
  }

  private async patch(sessionId: string, body: unknown): Promise<void> {
    const response = await fetch(
      `/api/sessions/${encodeURIComponent(sessionId)}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      },
    );
    if (!response.ok) throw new Error("Sitzung nicht aktualisierbar.");
  }
}
