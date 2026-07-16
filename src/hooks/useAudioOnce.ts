"use client";

import { useEffect, useState, type SyntheticEvent } from "react";
import { sessionRepository } from "@/lib/repository";
import { useAudioStore } from "@/stores/audioStore";

/**
 * Garantit la règle Hören (ARCHITECTURE.md §6) :
 *  - l'audio est marqué CONSOMMÉ dès l'événement `play` — pas `ended` —
 *    dans le store ET le repository : un refresh en pleine lecture ne
 *    permet pas de réécouter ;
 *  - la navigation est verrouillée pendant toute la lecture, déverrouillée
 *    uniquement à `ended` (ou `error`) ;
 *  - une pause (touches média, OS) relance immédiatement la lecture :
 *    l'épreuve officielle ne se met pas en pause.
 */
export function useAudioOnce(sessionId: string, audioId: string) {
  const hasPlayed = useAudioStore((state) =>
    state.playedAudioIds.includes(audioId),
  );
  const markPlayed = useAudioStore((state) => state.markPlayed);
  const setNavigationLocked = useAudioStore(
    (state) => state.setNavigationLocked,
  );

  const [isPlaying, setIsPlaying] = useState(false);

  // Sécurité : ne jamais laisser l'UI verrouillée si le composant se
  // démonte pendant une lecture (cas anormal).
  useEffect(() => {
    return () => setNavigationLocked(false);
  }, [setNavigationLocked]);

  const onPlay = () => {
    setIsPlaying(true);
    setNavigationLocked(true);
    markPlayed(audioId);
    void sessionRepository.markAudioPlayed(sessionId, audioId);
  };

  const onEnded = () => {
    setIsPlaying(false);
    setNavigationLocked(false);
  };

  const onError = () => {
    // Un fichier illisible ne doit pas laisser la session verrouillée.
    setIsPlaying(false);
    setNavigationLocked(false);
  };

  const onPause = (event: SyntheticEvent<HTMLAudioElement>) => {
    const element = event.currentTarget;
    if (!element.ended && isPlaying) {
      void element.play();
    }
  };

  return { hasPlayed, isPlaying, onPlay, onEnded, onError, onPause };
}
