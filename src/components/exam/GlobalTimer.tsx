"use client";

import { useExamTimer } from "@/hooks/useExamTimer";

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function formatSeconds(total: number): string {
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${minutes}:${pad(seconds)}`;
}

export interface GlobalTimerProps {
  /** Déclenché UNE fois au passage à zéro (soumission automatique, Sprint 8). */
  onExpire?: () => void;
}

/**
 * Timer global de l'épreuve (ARCHITECTURE.md §6).
 * États visuels : normal → gras sous 10 min → rouge sous 5 min
 * (le rouge est réservé à cet usage dans le design system).
 * Aucune animation : les chiffres changent, c'est tout — comme au centre.
 */
export function GlobalTimer({ onExpire }: GlobalTimerProps) {
  const remaining = useExamTimer({ onExpire });

  const isCritical = remaining !== null && remaining < 5 * 60;
  const isWarning = remaining !== null && remaining < 10 * 60;

  return (
    <div className="flex items-baseline gap-2 whitespace-nowrap px-4">
      <span className="text-[11px] uppercase tracking-wider text-muted">
        Verbleibende Zeit
      </span>
      <span
        role="timer"
        aria-live="off"
        className={
          "font-mono text-[15px] tabular-nums " +
          (isCritical
            ? "font-semibold text-danger"
            : isWarning
              ? "font-semibold text-foreground"
              : "text-foreground")
        }
      >
        {remaining === null ? "–:––" : formatSeconds(remaining)}
      </span>
    </div>
  );
}
