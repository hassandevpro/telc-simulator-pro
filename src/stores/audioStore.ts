import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

/**
 * État audio du mode examen (ARCHITECTURE.md §6).
 * - playedAudioIds : audios consommés — marqués dès `play`, pas `ended`.
 *   Doublé côté repository : un refresh pendant Hören ne permet pas de
 *   réécouter.
 * - navigationLocked : pendant la lecture, ExamNav et PartNavigation
 *   deviennent inertes et LockOverlay intercepte les clics. Le verrou ne
 *   se lève qu'à l'événement `ended` (hook useAudioOnce, Sprint 5).
 */
interface AudioState {
  playedAudioIds: string[];
  navigationLocked: boolean;

  /** Hydratation depuis le repository (bootstrap de session). */
  hydratePlayed: (audioIds: string[]) => void;
  markPlayed: (audioId: string) => void;
  hasPlayed: (audioId: string) => boolean;
  setNavigationLocked: (locked: boolean) => void;
  reset: () => void;
}

export const useAudioStore = create<AudioState>()(
  persist(
    (set, get) => ({
      playedAudioIds: [],
      navigationLocked: false,

      hydratePlayed: (audioIds) => set({ playedAudioIds: audioIds }),

      markPlayed: (audioId) =>
        set((state) =>
          state.playedAudioIds.includes(audioId)
            ? state
            : { playedAudioIds: [...state.playedAudioIds, audioId] },
        ),

      hasPlayed: (audioId) => get().playedAudioIds.includes(audioId),

      setNavigationLocked: (locked) => set({ navigationLocked: locked }),

      reset: () => set({ playedAudioIds: [], navigationLocked: false }),
    }),
    {
      name: "telc.audio",
      storage: createJSONStorage(() => localStorage),
      // Le verrou de navigation est un état transitoire : on ne le persiste
      // pas, sinon un crash pendant la lecture laisserait l'UI verrouillée.
      partialize: (state) => ({ playedAudioIds: state.playedAudioIds }),
    },
  ),
);
