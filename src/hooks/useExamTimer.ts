"use client";

import { useEffect, useRef, useState } from "react";
import { useTimerStore } from "@/stores/timerStore";

/**
 * Tick d'affichage du timer global (1 s).
 * Le temps restant est toujours CALCULÉ par le store (durée − écoulé depuis
 * `startedAt`) — jamais décrémenté ici. Ce hook ne fait que rafraîchir
 * l'affichage et déclencher `onExpire` UNE seule fois au passage à zéro.
 *
 * Retourne null avant le premier tick client (rendu serveur / hydratation) :
 * les consommateurs affichent un placeholder ("–:––").
 */
export function useExamTimer(options?: { onExpire?: () => void }): number | null {
  const startedAt = useTimerStore((state) => state.startedAt);
  const getRemainingSeconds = useTimerStore(
    (state) => state.getRemainingSeconds,
  );

  const [remaining, setRemaining] = useState<number | null>(null);
  const expireFired = useRef(false);
  const onExpireRef = useRef(options?.onExpire);
  const onExpire = options?.onExpire;

  useEffect(() => {
    onExpireRef.current = onExpire;
  }, [onExpire]);

  useEffect(() => {
    const tick = () => {
      const value = getRemainingSeconds();
      setRemaining(value);
      // On n'expire jamais un timer non ancré (session pas encore initialisée).
      if (value <= 0 && startedAt !== null && !expireFired.current) {
        expireFired.current = true;
        onExpireRef.current?.();
      }
    };
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [getRemainingSeconds, startedAt]);

  return remaining;
}
