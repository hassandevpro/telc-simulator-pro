import { Card, ProgressBar } from "@/components/ui";
import { EXAM_STRUCTURES, getPart, getSection } from "@/config/exam-structure";
import type { SessionScore } from "@/types/scoring";

/**
 * Détail par section et par Teil : points, maximum, items répondus.
 * Les libellés viennent de la structure officielle — jamais codés en dur.
 */
export function SectionBreakdown({ score }: { score: SessionScore }) {
  const structure = EXAM_STRUCTURES.B2;

  return (
    <div className="space-y-4">
      {score.sections.map((section) => {
        const label =
          getSection(structure, section.sectionId)?.label ??
          section.sectionId;
        const parts = score.parts.filter(
          (part) => part.sectionId === section.sectionId,
        );

        return (
          <Card key={section.sectionId} className="p-4">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[13px] font-semibold uppercase tracking-wide">
                {label}
              </h2>
              <span className="font-mono text-[13px] tabular-nums">
                {section.points} / {section.maxPoints}
              </span>
            </div>
            <div className="mt-2">
              <ProgressBar
                value={section.points}
                max={section.maxPoints}
                label={`${label}: ${section.points} von ${section.maxPoints} Punkten`}
              />
            </div>
            <div className="mt-3 divide-y divide-border border-t border-border">
              {parts.map((part) => {
                const partLabel =
                  getPart(structure, part.sectionId, part.partId)?.label ??
                  part.partId;
                return (
                  <div
                    key={part.partId}
                    className="flex items-center justify-between py-1.5 text-[13px]"
                  >
                    <span className="text-muted">{partLabel}</span>
                    <span className="font-mono tabular-nums">
                      {part.points} / {part.maxPoints}
                      <span className="ml-3 text-muted">
                        ({part.answeredCount}/{part.itemCount} beantwortet)
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
    </div>
  );
}
