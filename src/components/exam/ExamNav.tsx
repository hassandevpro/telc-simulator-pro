"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ExamStructure } from "@/types/exam";
import {
  buildNavEntries,
  currentPageSegment,
  sessionPath,
} from "@/lib/exam-navigation";
import { useAudioStore } from "@/stores/audioStore";

export interface ExamNavProps {
  sessionId: string;
  structure: ExamStructure;
}

/**
 * Navigation sticky à deux niveaux (ARCHITECTURE.md §6) :
 * sections en majuscules, Teile en dessous, accès direct à tout Teil.
 * Teil courant : fond gris clair + bordure basse — aucune couleur vive.
 * Pendant la lecture audio (navigationLocked), toute la nav devient inerte :
 * ni précédent, ni suivant, ni changement de section.
 */
export function ExamNav({ sessionId, structure }: ExamNavProps) {
  const pathname = usePathname();
  const locked = useAudioStore((state) => state.navigationLocked);

  const entries = buildNavEntries(structure);
  const current = currentPageSegment(pathname);

  const sections = structure.schriftlichePruefung.sections;

  return (
    <nav
      aria-label="Prüfungsteile"
      className={
        "flex items-stretch gap-6 overflow-x-auto px-4 " +
        (locked ? "pointer-events-none opacity-50" : "")
      }
    >
      {sections.map((section) => {
        const sectionEntries = entries.filter(
          (entry) => entry.sectionId === section.id,
        );
        const sectionActive = sectionEntries.some(
          (entry) => entry.pageSegment === current,
        );

        return (
          <div key={section.id} className="flex flex-col justify-center py-1.5">
            <span
              className={
                "text-[11px] uppercase tracking-wider " +
                (sectionActive ? "font-semibold text-foreground" : "text-muted")
              }
            >
              {section.label}
            </span>
            <div className="mt-0.5 flex gap-1">
              {sectionEntries.map((entry) => {
                const active = entry.pageSegment === current;
                return (
                  <Link
                    key={entry.partId}
                    href={sessionPath(sessionId, entry.segment)}
                    aria-current={active ? "page" : undefined}
                    tabIndex={locked ? -1 : undefined}
                    className={
                      "border px-2 py-0.5 text-[12px] rounded-sm " +
                      "transition-colors duration-100 " +
                      (active
                        ? "border-border border-b-accent border-b-2 bg-surface font-medium text-foreground"
                        : "border-transparent text-muted hover:bg-surface hover:text-foreground")
                    }
                  >
                    {entry.partLabel}
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </nav>
  );
}
