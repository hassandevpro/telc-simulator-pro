"use client";

import { useAudioStore } from "@/stores/audioStore";

/**
 * Verrouillage de l'en-tête pendant la lecture audio (ARCHITECTURE.md §6).
 * Troisième ligne de défense après l'inertie d'ExamNav et de PartNavigation :
 * un écran transparent intercepte tout clic sur l'en-tête (nav + timer),
 * avec un rappel sobre du verrou. Aucune interaction n'est nécessaire dans
 * l'en-tête pendant l'écoute — le candidat répond dans la zone de contenu.
 */
export function LockOverlay() {
  const locked = useAudioStore((state) => state.navigationLocked);
  if (!locked) return null;

  return (
    <div
      className="absolute inset-0 z-10 flex cursor-not-allowed items-center justify-end px-4"
      aria-hidden="true"
    >
      <span className="border border-border bg-surface px-2 py-0.5 text-[11px] uppercase tracking-wider text-muted rounded-sm">
        Navigation gesperrt
      </span>
    </div>
  );
}
