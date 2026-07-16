import type { ExamStructure, SectionId } from "@/types/exam";

/**
 * Navigation d'examen — entièrement DÉRIVÉE de la structure officielle
 * (config/exam-structure.ts). Aucun ordre ni libellé codé en dur dans les
 * composants : ExamNav et PartNavigation consomment ces helpers.
 */

export interface NavEntry {
  sectionId: SectionId;
  sectionLabel: string;
  partId: string;
  partLabel: string;
  /**
   * Segment d'URL relatif à la session, ex. "lesen/teil-1".
   * Cas Schreiben : les deux Aufgaben vivent sur la même page —
   * le segment porte une ancre ("schreiben#aufgabe-a").
   */
  segment: string;
  /** Segment de PAGE (sans ancre) — sert au surlignage et au Zurück/Weiter. */
  pageSegment: string;
}

export function buildNavEntries(structure: ExamStructure): NavEntry[] {
  return structure.schriftlichePruefung.sections.flatMap((section) =>
    section.parts.map((part) => {
      const pageSegment =
        section.id === "schreiben"
          ? "schreiben"
          : `${section.id}/${part.id}`;
      const segment =
        section.id === "schreiben"
          ? `schreiben#${part.id}`
          : pageSegment;
      return {
        sectionId: section.id,
        sectionLabel: section.label,
        partId: part.id,
        partLabel: part.label,
        segment,
        pageSegment,
      };
    }),
  );
}

/**
 * Arrêts de page ordonnés pour Zurück/Weiter.
 * Schreiben (deux Aufgaben, une page) compte pour UN arrêt.
 */
export function buildPageStops(structure: ExamStructure): string[] {
  const stops: string[] = [];
  for (const entry of buildNavEntries(structure)) {
    if (stops[stops.length - 1] !== entry.pageSegment) {
      stops.push(entry.pageSegment);
    }
  }
  return stops;
}

export function sessionPath(sessionId: string, segment: string): string {
  return `/session/${sessionId}/${segment}`;
}

/** Extrait le segment de page depuis le pathname ("/session/{id}/…"). */
export function currentPageSegment(pathname: string): string | null {
  const match = pathname.match(/^\/session\/[^/]+\/(.+?)\/?$/);
  return match ? match[1] : null;
}

export function getAdjacentStops(
  stops: string[],
  current: string | null,
): { prev: string | null; next: string | null } {
  if (current === null) return { prev: null, next: null };
  const index = stops.indexOf(current);
  if (index === -1) return { prev: null, next: null };
  return {
    prev: index > 0 ? stops[index - 1] : null,
    next: index < stops.length - 1 ? stops[index + 1] : null,
  };
}
