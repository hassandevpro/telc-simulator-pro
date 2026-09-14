/**
 * Catalogue de la Vorbereitung — LA source de vérité du contenu pédagogique.
 * Les pages et l'API lisent uniquement ces helpers, jamais les fichiers de
 * leçons directement.
 */

import type { Level } from "@/types/exam";
import { GRAMMATIK_B1_LESSONS } from "./lessons/grammatik-b1";
import { GRAMMATIK_B2_LESSONS } from "./lessons/grammatik-b2";
import { PRUEFUNGSTEIL_LESSONS } from "./lessons/pruefungsteile";
import { REDEMITTEL_LESSONS } from "./lessons/redemittel";
import type { Lesson, TrackDefinition, TrackId } from "./types";

export const TRACKS: TrackDefinition[] = [
  {
    id: "pruefungsteile",
    label: "Prüfungsteile",
    description:
      "Format, Bewertung und Strategie für jeden Teil der schriftlichen Prüfung.",
  },
  {
    id: "grammatik",
    label: "Grammatik",
    description:
      "Von den B1-Grundlagen bis zu den Strukturen, die im B2 geprüft werden.",
  },
  {
    id: "redemittel",
    label: "Redemittel & Wortschatz",
    description:
      "Fertige Bausteine für den schriftlichen Ausdruck und thematischer Wortschatz.",
  },
];

/**
 * Ordre d'affichage : guides d'abord (on comprend l'épreuve avant de
 * réviser), puis grammaire B1 → B2 (progression), puis Redemittel.
 */
export const LESSONS: Lesson[] = [
  ...PRUEFUNGSTEIL_LESSONS,
  ...GRAMMATIK_B1_LESSONS,
  ...GRAMMATIK_B2_LESSONS,
  ...REDEMITTEL_LESSONS,
];

/** Index slug → leçon, construit une seule fois au chargement du module. */
const BY_SLUG = new Map(LESSONS.map((lesson) => [lesson.slug, lesson]));

export function getLesson(slug: string): Lesson | undefined {
  return BY_SLUG.get(slug);
}

export function getTrack(id: TrackId): TrackDefinition | undefined {
  return TRACKS.find((track) => track.id === id);
}

/** Leçons d'un parcours, filtrées par niveau si `level` est fourni. */
export function getLessons(track: TrackId, level?: Level): Lesson[] {
  return LESSONS.filter(
    (lesson) =>
      lesson.track === track && (!level || lesson.levels.includes(level)),
  );
}

/** Tous les slugs — sert à `generateStaticParams` et à la validation d'API. */
export function allLessonSlugs(): string[] {
  return LESSONS.map((lesson) => lesson.slug);
}

/**
 * Leçon précédente / suivante DANS LE MÊME parcours — la navigation de bas
 * de page suit la progression pédagogique, pas l'ordre global.
 */
export function getLessonNeighbours(slug: string): {
  previous?: Lesson;
  next?: Lesson;
} {
  const lesson = getLesson(slug);
  if (!lesson) return {};
  const siblings = LESSONS.filter((item) => item.track === lesson.track);
  const index = siblings.findIndex((item) => item.slug === slug);
  return {
    previous: index > 0 ? siblings[index - 1] : undefined,
    next: index < siblings.length - 1 ? siblings[index + 1] : undefined,
  };
}

export * from "./types";
