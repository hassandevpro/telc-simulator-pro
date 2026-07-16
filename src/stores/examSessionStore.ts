import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { SectionId } from "@/types/exam";
import type {
  AnswerMap,
  AnswerValue,
  PersistedSessionState,
  SessionStatus,
} from "@/types/session";

/**
 * État client de la session d'examen : réponses, position courante, statut.
 * Chaque mutation de réponse passe par setAnswer, qui lève le drapeau
 * hasUnsavedChanges — c'est le signal qu'écoute useAutosave pour
 * synchroniser vers le SessionRepository (debounce 2 s), puis markSaved()
 * rabaisse le drapeau. L'hydratation (bootstrap) ne lève JAMAIS le drapeau :
 * recharger une session ne déclenche pas de sauvegarde fantôme.
 * Persisté en LocalStorage (mode dégradé refresh/crash), la source de
 * vérité restant le repository.
 */
interface ExamSessionState {
  sessionId: string | null;
  examId: string | null;
  status: SessionStatus;
  answers: AnswerMap;
  currentSection: SectionId | null;
  currentPart: string | null;
  /** Levé par setAnswer, rabaissé par markSaved (useAutosave). */
  hasUnsavedChanges: boolean;

  hydrate: (persisted: PersistedSessionState) => void;
  setAnswer: (questionId: string, value: AnswerValue) => void;
  markSaved: () => void;
  setStatus: (status: SessionStatus) => void;
  setPosition: (section: SectionId, part: string) => void;
  reset: () => void;
}

const initialState = {
  sessionId: null,
  examId: null,
  status: "AUDIO_CHECK" as SessionStatus,
  answers: {},
  currentSection: null,
  currentPart: null,
  hasUnsavedChanges: false,
};

export const useExamSessionStore = create<ExamSessionState>()(
  persist(
    (set) => ({
      ...initialState,

      hydrate: (persisted) =>
        set({
          sessionId: persisted.sessionId,
          examId: persisted.examId,
          status: persisted.status,
          answers: persisted.answers,
          hasUnsavedChanges: false,
        }),

      setAnswer: (questionId, value) =>
        set((state) => ({
          answers: { ...state.answers, [questionId]: value },
          hasUnsavedChanges: true,
        })),

      markSaved: () => set({ hasUnsavedChanges: false }),

      setStatus: (status) => set({ status }),

      setPosition: (section, part) =>
        set({ currentSection: section, currentPart: part }),

      reset: () => set(initialState),
    }),
    {
      name: "telc.exam-session",
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
