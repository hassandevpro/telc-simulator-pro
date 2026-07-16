import { Card } from "@/components/ui";
import { projectPassProbability } from "@/lib/scoring/pass-probability";
import { EXAM_STRUCTURES, getPart } from "@/config/exam-structure";
import type { SessionScore } from "@/types/scoring";

/**
 * Projection de réussite — arithmétique de seuil, pas de pseudo-magie.
 * Affiche les points Schreiben nécessaires et trois scénarios.
 */
export function PassProbability({ score }: { score: SessionScore }) {
  const projection = projectPassProbability(score);
  const structure = EXAM_STRUCTURES.B2;

  const chosenLabel = score.writing.chosenPartId
    ? (getPart(structure, "schreiben", score.writing.chosenPartId)?.label ??
      score.writing.chosenPartId)
    : null;

  const verdictText =
    projection.verdict === "secured"
      ? "Die schriftliche Bestehensgrenze ist bereits mit dem objektiven Teil erreicht."
      : projection.verdict === "impossible"
        ? "Die schriftliche Bestehensgrenze ist auch mit maximaler Schreiben-Punktzahl nicht mehr erreichbar."
        : `Zum Bestehen des schriftlichen Teils benötigen Sie mindestens ${projection.neededWritingPoints} von ${score.writing.maxPoints} Punkten im Schreiben.`;

  return (
    <Card className="p-4">
      <h2 className="text-[13px] font-semibold uppercase tracking-wide">
        Bestehensprognose (schriftlicher Teil)
      </h2>
      <p
        className={
          "mt-2 text-[13px] " +
          (projection.verdict === "impossible" ? "text-danger" : "")
        }
      >
        {verdictText}
      </p>

      <div className="mt-3 divide-y divide-border border-t border-border">
        {projection.scenarios.map((scenario) => (
          <div
            key={scenario.label}
            className="flex items-center justify-between py-1.5 text-[13px]"
          >
            <span className="text-muted">{scenario.label}</span>
            <span className="font-mono tabular-nums">
              {scenario.totalPoints} / {score.writtenMaxPoints} (
              {Math.round(scenario.totalRatio * 100)} %) ·{" "}
              {scenario.passes ? "bestanden" : "nicht bestanden"}
            </span>
          </div>
        ))}
      </div>

      <p className="mt-3 text-[12px] text-muted">
        {chosenLabel
          ? `Bewertete Schreibaufgabe: ${chosenLabel} (${score.writing.wordCount} Wörter) — Korrektur erfolgt manuell.`
          : "Keine Schreibaufgabe bearbeitet."}{" "}
        Die mündliche Prüfung ist nicht Teil dieser Simulation.
      </p>
    </Card>
  );
}
