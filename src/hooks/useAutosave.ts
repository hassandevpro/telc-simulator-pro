"use client";

import { useEffect, useState } from "react";
import { retryDelayMs, saveAnswersOnce } from "@/lib/autosave";
import { sessionRepository } from "@/lib/repository";
import { useExamSessionStore } from "@/stores/examSessionStore";

export type AutosaveStatus = "idle" | "pending" | "saved" | "error" | "locked";

const DEBOUNCE_MS = 2000;

/**
 * Écrit IMMÉDIATEMENT les réponses en attente vers le repository, sans
 * attendre le debounce. Utilisé par le filet pagehide/visibilitychange
 * et par la sauvegarde sur blur de l'éditeur Schreiben.
 *
 * Le drapeau « non sauvegardé » n'est rabaissé qu'APRÈS confirmation du
 * serveur : un échec laisse les réponses en attente, l'autosave réessaiera.
 */
export function flushAnswers(sessionId: string): void {
  if (!useExamSessionStore.getState().hasUnsavedChanges) return;
  void saveAnswersOnce(sessionId, sessionRepository, useExamSessionStore);
}

/**
 * Autosave (ARCHITECTURE.md §6) : 2 s après la dernière modification de
 * réponse, la carte des réponses part vers le SessionRepository.
 *
 * Échec passager → indicateur « Speicherfehler », réponses conservées comme
 * non sauvegardées, et nouvelle tentative automatique (2 s, 4 s, 8 s …
 * 30 s). Refus définitif (épreuve close ou expirée) → « locked » : inutile
 * de réessayer, le candidat doit passer à la remise.
 *
 * Filet de sécurité : au masquage de la page (pagehide/visibilitychange)
 * ou au démontage, les modifications en attente sont envoyées immédiatement.
 *
 * Monté UNE fois, dans ExamShell. Retourne l'état pour l'indicateur
 * près du timer.
 */
export function useAutosave(sessionId: string): AutosaveStatus {
  const answers = useExamSessionStore((state) => state.answers);
  const hasUnsavedChanges = useExamSessionStore(
    (state) => state.hasUnsavedChanges,
  );

  const [lastResult, setLastResult] = useState<
    "idle" | "saved" | "error" | "locked"
  >("idle");
  // Numéro de la tentative en échec : le relever reprogramme l'écriture.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!hasUnsavedChanges || lastResult === "locked") return;

    const delay = attempt === 0 ? DEBOUNCE_MS : retryDelayMs(attempt);
    const timeout = window.setTimeout(async () => {
      const outcome = await saveAnswersOnce(
        sessionId,
        sessionRepository,
        useExamSessionStore,
      );
      if (outcome.kind === "saved") {
        setAttempt(0);
        setLastResult("saved");
      } else if (outcome.kind === "locked") {
        setLastResult("locked");
      } else {
        setLastResult("error");
        setAttempt((value) => value + 1);
      }
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [answers, hasUnsavedChanges, sessionId, attempt, lastResult]);

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

  if (lastResult === "locked") return "locked";
  if (hasUnsavedChanges) return lastResult === "error" ? "error" : "pending";
  // Plus rien en attente (un flush a fini par passer) : l'erreur est levée.
  return lastResult === "error" ? "saved" : lastResult;
}
