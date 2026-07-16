"use client";

import { usePathname, useRouter } from "next/navigation";
import type { ExamStructure } from "@/types/exam";
import {
  buildPageStops,
  currentPageSegment,
  getAdjacentStops,
  sessionPath,
} from "@/lib/exam-navigation";
import { useAudioStore } from "@/stores/audioStore";
import { Button } from "@/components/ui";

export interface PartNavigationProps {
  sessionId: string;
  structure: ExamStructure;
}

/**
 * Boutons Zurück / Weiter en bas de zone (ARCHITECTURE.md §6).
 * L'ordre des arrêts est dérivé de la structure officielle ; sur le dernier
 * Teil, « Weiter » devient « Zur Abgabe » et mène à la remise finale.
 * Inerte pendant la lecture audio (navigationLocked) — pas de précédent,
 * pas de suivant.
 */
export function PartNavigation({ sessionId, structure }: PartNavigationProps) {
  const pathname = usePathname();
  const router = useRouter();
  const locked = useAudioStore((state) => state.navigationLocked);

  const stops = buildPageStops(structure);
  const current = currentPageSegment(pathname);

  // Pas de Zurück/Weiter sur la page de remise ni hors des Teile.
  if (current === null || current === "abgabe" || !stops.includes(current)) {
    return null;
  }

  const { prev, next } = getAdjacentStops(stops, current);
  const isLast = next === null;

  return (
    <div className="border-t border-border bg-background">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Button
          variant="secondary"
          disabled={locked || prev === null}
          onClick={() => prev && router.push(sessionPath(sessionId, prev))}
        >
          ← Zurück
        </Button>
        <Button
          variant={isLast ? "secondary" : "primary"}
          disabled={locked}
          onClick={() =>
            router.push(sessionPath(sessionId, isLast ? "abgabe" : next!))
          }
        >
          {isLast ? "Zur Abgabe" : "Weiter →"}
        </Button>
      </div>
    </div>
  );
}
