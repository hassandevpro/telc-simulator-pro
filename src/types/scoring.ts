import type { SectionId } from "@/types/exam";

/**
 * Types du domaine — résultat d'une session corrigée.
 * Produits par lib/scoring/score-session.ts, stockés dans la session
 * persistée et affichés par les composants results/.
 */

export interface PartScore {
  sectionId: SectionId;
  partId: string;
  points: number;
  maxPoints: number;
  answeredCount: number;
  itemCount: number;
}

export interface SectionScore {
  sectionId: SectionId;
  points: number;
  maxPoints: number;
  answeredCount: number;
  itemCount: number;
}

export interface WritingInfo {
  /** Aufgabe retenue (production non vide ; la plus longue si les deux). */
  chosenPartId: string | null;
  wordCount: number;
  /** Points maximum du Schreiben (45) — correction manuelle en v1. */
  maxPoints: number;
}

export interface SessionScore {
  scoredAt: number;
  /** Points obtenus sur la partie objective (Lesen + Sprachbausteine + Hören). */
  objectivePoints: number;
  objectiveMaxPoints: number;
  /** Total de l'épreuve écrite (objectif + Schreiben) : 225 au B2. */
  writtenMaxPoints: number;
  /** Seuil de réussite telc : 0.6. */
  passThresholdRatio: number;
  parts: PartScore[];
  sections: SectionScore[];
  writing: WritingInfo;
}

export type PassVerdict = "secured" | "open" | "impossible";

export interface PassScenario {
  label: string;
  writingPoints: number;
  totalPoints: number;
  totalRatio: number;
  passes: boolean;
}

export interface PassProjection {
  /** Points Schreiben nécessaires pour atteindre le seuil écrit. */
  neededWritingPoints: number;
  verdict: PassVerdict;
  scenarios: PassScenario[];
}
