import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * Timer global de l'épreuve (ARCHITECTURE.md §5–6).
 * Ne stocke QUE l'ancre `startedAt` et la durée : le temps restant est
 * toujours CALCULÉ (durée − (now − startedAt)), jamais décrémenté.
 * Conséquence : refresh, crash, fermeture d'onglet — le temps continue
 * de courir, et le timer ne peut pas être réinitialisé accidentellement.
 * Le tick d'affichage (1 s) vit dans le hook useExamTimer (Sprint 1).
 */
interface TimerState {
  sessionId: string | null;
  /** Epoch ms — posé une seule fois, jamais modifié. */
  startedAt: number | null;
  durationSeconds: number;

  /**
   * Initialise le timer pour une session. Sans effet si la session est
   * déjà initialisée (protection contre la réinitialisation accidentelle).
   */
  initialize: (
    sessionId: string,
    startedAt: number,
    durationSeconds: number,
  ) => void;
  getRemainingSeconds: () => number;
  isExpired: () => boolean;
  /** Réservé à la fin de session (remise / expiration validée serveur). */
  clear: () => void;
}

export const useTimerStore = create<TimerState>()(
  persist(
    (set, get) => ({
      sessionId: null,
      startedAt: null,
      durationSeconds: 0,

      initialize: (sessionId, startedAt, durationSeconds) => {
        const current = get();
        if (current.sessionId === sessionId && current.startedAt !== null) {
          return; // déjà ancré : on ne touche à rien
        }
        set({ sessionId, startedAt, durationSeconds });
      },

      getRemainingSeconds: () => {
        const { startedAt, durationSeconds } = get();
        if (startedAt === null) return durationSeconds;
        const elapsed = Math.floor((Date.now() - startedAt) / 1000);
        return Math.max(0, durationSeconds - elapsed);
      },

      isExpired: () => get().getRemainingSeconds() <= 0,

      clear: () =>
        set({ sessionId: null, startedAt: null, durationSeconds: 0 }),
    }),
    {
      name: "telc.timer",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
