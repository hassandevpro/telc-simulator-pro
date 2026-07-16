import type {
  AnswerMap,
  PersistedSessionState,
  SessionStatus,
} from "@/types/session";
import type { SessionRepository } from "./session-repository";

const KEY_PREFIX = "telc.session.";
const keyOf = (sessionId: string) => `${KEY_PREFIX}${sessionId}`;

function readState(sessionId: string): PersistedSessionState | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(keyOf(sessionId));
  if (!raw) return null;
  try {
    return JSON.parse(raw) as PersistedSessionState;
  } catch {
    // Donnée corrompue : on la neutralise plutôt que de faire planter la session.
    window.localStorage.removeItem(keyOf(sessionId));
    return null;
  }
}

function writeState(state: PersistedSessionState): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    keyOf(state.sessionId),
    JSON.stringify({ ...state, updatedAt: Date.now() }),
  );
}

/**
 * Implémentation v1 du SessionRepository — LocalStorage.
 * Limite assumée (ARCHITECTURE.md §10) : vider le cache navigateur perd
 * la session en cours. Résolu en v2 par ApiSessionRepository.
 */
export class LocalStorageSessionRepository implements SessionRepository {
  async load(sessionId: string): Promise<PersistedSessionState | null> {
    return readState(sessionId);
  }

  async listSessions(): Promise<PersistedSessionState[]> {
    if (typeof window === "undefined") return [];
    const sessions: PersistedSessionState[] = [];
    for (let i = 0; i < window.localStorage.length; i += 1) {
      const key = window.localStorage.key(i);
      if (!key?.startsWith(KEY_PREFIX)) continue;
      const state = readState(key.slice(KEY_PREFIX.length));
      if (state) sessions.push(state);
    }
    return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async save(state: PersistedSessionState): Promise<void> {
    writeState(state);
  }

  async saveAnswers(sessionId: string, answers: AnswerMap): Promise<void> {
    const state = readState(sessionId);
    if (!state) return;
    writeState({ ...state, answers: { ...state.answers, ...answers } });
  }

  async setStatus(sessionId: string, status: SessionStatus): Promise<void> {
    const state = readState(sessionId);
    if (!state) return;
    writeState({ ...state, status });
  }

  async markAudioPlayed(sessionId: string, audioId: string): Promise<void> {
    const state = readState(sessionId);
    if (!state) return;
    if (state.playedAudioIds.includes(audioId)) return;
    writeState({
      ...state,
      playedAudioIds: [...state.playedAudioIds, audioId],
    });
  }

  async clear(sessionId: string): Promise<void> {
    if (typeof window === "undefined") return;
    window.localStorage.removeItem(keyOf(sessionId));
  }
}
