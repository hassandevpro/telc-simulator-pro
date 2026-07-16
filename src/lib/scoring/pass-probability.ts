import type { PassProjection, PassScenario, SessionScore } from "@/types/scoring";

/**
 * Projection de réussite (ARCHITECTURE.md §7) — v1 honnête : aucune
 * pseudo-probabilité, une simple arithmétique de seuil. Le score objectif
 * est connu ; le Schreiben (45 pts, correction manuelle) est projeté selon
 * trois hypothèses : 0 point, 60 % (27 pts), maximum (45 pts).
 * Périmètre : épreuve ÉCRITE (l'oral telc, 75 pts, est hors simulateur).
 */
export function projectPassProbability(score: SessionScore): PassProjection {
  const threshold = score.writtenMaxPoints * score.passThresholdRatio;
  const neededWritingPoints = Math.max(
    0,
    Math.round((threshold - score.objectivePoints) * 100) / 100,
  );

  const verdict =
    neededWritingPoints === 0
      ? "secured"
      : neededWritingPoints > score.writing.maxPoints
        ? "impossible"
        : "open";

  const hypotheses: { label: string; ratio: number }[] = [
    { label: "Schreiben: 0 Punkte", ratio: 0 },
    { label: "Schreiben: 60 %", ratio: 0.6 },
    { label: "Schreiben: Maximum", ratio: 1 },
  ];

  const scenarios: PassScenario[] = hypotheses.map(({ label, ratio }) => {
    const writingPoints =
      Math.round(score.writing.maxPoints * ratio * 100) / 100;
    const totalPoints = score.objectivePoints + writingPoints;
    return {
      label,
      writingPoints,
      totalPoints,
      totalRatio: totalPoints / score.writtenMaxPoints,
      passes: totalPoints >= threshold,
    };
  });

  return { neededWritingPoints, verdict, scenarios };
}
