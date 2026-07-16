import { Card } from "@/components/ui";
import type { SessionScore } from "@/types/scoring";

/**
 * Synthèse du score : points objectifs obtenus, pourcentage, seuil écrit.
 */
export function ScoreSummary({ score }: { score: SessionScore }) {
  const ratio =
    score.objectiveMaxPoints > 0
      ? score.objectivePoints / score.objectiveMaxPoints
      : 0;
  const threshold = score.writtenMaxPoints * score.passThresholdRatio;

  return (
    <Card className="p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="text-[12px] uppercase tracking-wider text-muted">
            Objektiver Teil (Lesen · Sprachbausteine · Hören)
          </p>
          <p className="mt-1 text-2xl font-semibold tabular-nums">
            {score.objectivePoints}
            <span className="text-base font-normal text-muted">
              {" "}
              / {score.objectiveMaxPoints} Punkte
            </span>
          </p>
        </div>
        <div className="text-right">
          <p className="text-2xl font-semibold tabular-nums">
            {Math.round(ratio * 100)} %
          </p>
          <p className="text-[12px] text-muted">
            Bestehensgrenze (schriftlich): {threshold} / {score.writtenMaxPoints}
          </p>
        </div>
      </div>
    </Card>
  );
}
