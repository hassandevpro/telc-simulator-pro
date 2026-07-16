"use client";

import { useEffect, useState } from "react";
import { sessionRepository } from "@/lib/repository";
import { useExamSessionStore } from "@/stores/examSessionStore";

export type AutosaveStatus = "idle" | "pending" | "saved" | "error";

const DEBOUNCE_MS = 2000;

/**
 * Écrit IMMÉDIATEMENT les réponses en attente vers le repository, sans
 * attendre le debounce. Utilisé par le filet pagehide/visibilitychange
 * et par la sauvegarde sur blur de l'éditeur Schreiben.
 */
export function flushAnswers(sessionId: string): void {
  const state = useExamSessionStore.getState();
  if (!state.hasUnsavedChanges) return;
  void sessionRepository.saveAnswers(sessionId, state.answers);
  state.markSaved();
}

/**
 * Autosave (ARCHITECTURE.md §6) : 2 s après la dernière modification de
 * réponse, la carte des réponses part vers le SessionRepository, puis
 * markSaved() rabaisse le drapeau. L'hydratation ne déclenche rien
 * (le drapeau hasUnsavedChanges n'est levé que par setAnswer).
 *
 * L'état « pending » est DÉRIVÉ du drapeau hasUnsavedChanges — aucun
 * setState synchrone dans l'effet, seul le résultat de l'écriture
 * (saved/error) est stocké.
 *
 * Filet de sécurité : au masquage de la page (pagehide/visibilitychange)
 * ou au démontage, les modifications en attente sont écrites immédiatement,
 * sans attendre le debounce — v1 LocalStorage : écriture synchrone fiable.
 *
 * Monté UNE fois, dans ExamShell. Retourne l'état pour l'indicateur
 * « Gespeichert » près du timer.
 */
export function useAutosave(sessionId: string): AutosaveStatus {
  const answers = useExamSessionStore((state) => state.answers);
  const hasUnsavedChanges = useExamSessionStore(
    (state) => state.hasUnsavedChanges,
  );
  const markSaved = useExamSessionStore((state) => state.markSaved);

  const [lastResult, setLastResult] = useState<"idle" | "saved" | "error">(
    "idle",
  );

  // Debounce : chaque modification repousse l'écriture de 2 s.
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const timeout = window.setTimeout(async () => {
      try {
        await sessionRepository.saveAnswers(sessionId, answers);
        markSaved();
        setLastResult("saved");
      } catch {
        setLastResult("error");
      }
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeout);
  }, [answers, hasUnsavedChanges, sessionId, markSaved]);

  // Flush immédiat si la page se masque avec des changements en attente.
  useEffect(() => {
    const flush = () => flushAnswers(sessionId);

    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", flush);
      flush(); // démontage de la coquille
    };
  }, [sessionId]);

  return hasUnsavedChanges ? "pending" : lastResult;
}
