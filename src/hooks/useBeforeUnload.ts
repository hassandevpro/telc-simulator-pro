"use client";

import { useEffect } from "react";

/**
 * Avertissement natif du navigateur à la fermeture/rechargement de l'onglet
 * pendant une session en cours (ARCHITECTURE.md §2 — hooks).
 * Le contenu du message est imposé par le navigateur ; on ne fait que
 * signaler qu'un départ mérite confirmation. Les réponses sont de toute
 * façon déjà sauvegardées (autosave + flush pagehide) — l'avertissement
 * protège contre la sortie accidentelle du mode examen, pas contre une
 * perte de données.
 */
export function useBeforeUnload(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    const handler = (event: BeforeUnloadEvent) => {
      event.preventDefault();
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [enabled]);
}
