import { SessionWriteError } from "@/lib/repository/session-repository";
import type { AnswerMap } from "@/types/session";

/**
 * Logique d'autosave, sans React — testable telle quelle.
 *
 * Règle : une réponse n'est marquée sauvegardée QUE si le serveur a confirmé
 * l'écriture. En cas d'échec passager (réseau, 5xx), les réponses restent en
 * attente et une nouvelle tentative est programmée ; en cas de refus
 * définitif (épreuve close ou expirée), on cesse de réessayer et on le dit.
 */

export type AutosaveOutcome =
  | { kind: "saved" }
  | { kind: "retry"; error: string }
  | { kind: "locked"; code: string | null; error: string };

export interface AutosaveTarget {
  saveAnswers(sessionId: string, answers: AnswerMap): Promise<void>;
}

export interface AutosaveStore {
  getState(): {
    answers: AnswerMap;
    hasUnsavedChanges: boolean;
    markSavedIfUnchanged: (snapshot: AnswerMap) => void;
  };
}

/** Une tentative d'écriture des réponses en attente. */
export async function saveAnswersOnce(
  sessionId: string,
  repository: AutosaveTarget,
  store: AutosaveStore,
): Promise<AutosaveOutcome> {
  const snapshot = store.getState().answers;
  try {
    await repository.saveAnswers(sessionId, snapshot);
  } catch (cause) {
    if (cause instanceof SessionWriteError && !cause.retryable) {
      return { kind: "locked", code: cause.code, error: cause.message };
    }
    return {
      kind: "retry",
      error: cause instanceof Error ? cause.message : "Speicherfehler.",
    };
  }
  store.getState().markSavedIfUnchanged(snapshot);
  return { kind: "saved" };
}

/** Délai avant la tentative n° `attempt` (1, 2, …) : 2 s, 4 s, 8 s … 30 s max. */
export function retryDelayMs(attempt: number): number {
  return Math.min(30_000, 2_000 * 2 ** Math.max(0, attempt - 1));
}
