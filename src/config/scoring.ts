import type { Level, SectionId } from "@/types/exam";

/**
 * Barème et seuils officiels telc — consommé par lib/scoring (Sprint 8).
 * Valeurs conformes au format telc Deutsch B2 ; vérification finale contre
 * les documents officiels au module Scoring.
 */

export interface ScoringConfig {
  /** Points maximum de l'épreuve écrite. */
  writtenMaxPoints: number;
  /** Seuil de réussite telc : 60 % de l'épreuve écrite. */
  writtenPassThreshold: number;
  /** Points maximum par section. */
  sectionMaxPoints: Record<SectionId, number>;
}

export const SCORING: Record<Level, ScoringConfig> = {
  B2: {
    writtenMaxPoints: 225,
    writtenPassThreshold: 0.6,
    sectionMaxPoints: {
      lesen: 75,
      sprachbausteine: 30,
      hoeren: 75,
      schreiben: 45,
    },
  },
  // Renseigné à l'ajout du niveau B1.
  B1: {
    writtenMaxPoints: 225,
    writtenPassThreshold: 0.6,
    sectionMaxPoints: {
      lesen: 75,
      sprachbausteine: 30,
      hoeren: 75,
      schreiben: 45,
    },
  },
};
