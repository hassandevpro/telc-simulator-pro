"use client";

import { Card, Select } from "@/components/ui";
import { useExamSessionStore } from "@/stores/examSessionStore";
import type {
  AdMatchingContent,
  AdMatchingShared,
  ContentQuestion,
} from "@/types/question-content";

export const NO_ANSWER_KEY = "X";

export interface AdMatchingProps {
  shared: AdMatchingShared;
  questions: ContentQuestion<AdMatchingContent>[];
  startNumber: number;
  /** Ajoute l'option officielle « X — keine passende Anzeige ». */
  allowNoAnswer?: boolean;
}

/**
 * Lesen Teil 3 — 10 situations, 12 annonces A–L.
 * Chaque situation porte un dropdown A–L (+ X : aucune annonce adéquate).
 * Les annonces sont affichées en grille compacte au-dessus, comme la page
 * d'annonces du livret officiel.
 */
export function AdMatching({
  shared,
  questions,
  startNumber,
  allowNoAnswer = true,
}: AdMatchingProps) {
  const answers = useExamSessionStore((state) => state.answers);
  const setAnswer = useExamSessionStore((state) => state.setAnswer);

  const options = [
    ...shared.ads.map((ad) => ({ value: ad.key, label: ad.key })),
    ...(allowNoAnswer
      ? [{ value: NO_ANSWER_KEY, label: `${NO_ANSWER_KEY} — keine passende Anzeige` }]
      : []),
  ];

  return (
    <div>
      {shared.instructions ? (
        <p className="mb-4 text-[13px] italic text-muted">
          {shared.instructions}
        </p>
      ) : null}

      <div className="mb-6 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {shared.ads.map((ad) => (
          <Card key={ad.key} muted className="p-3">
            <div className="flex gap-2 text-[13px]">
              <span className="shrink-0 font-semibold">{ad.key}</span>
              <span className="leading-snug">{ad.text}</span>
            </div>
          </Card>
        ))}
      </div>

      <Card className="divide-y divide-border">
        {questions.map((question, index) => {
          const number = startNumber + index;
          const value = answers[question.id] ?? "";
          return (
            <div
              key={question.id}
              className="flex items-center gap-3 px-4 py-2.5"
            >
              <span className="w-6 shrink-0 text-[13px] font-semibold">
                {number}
              </span>
              <p className="flex-1 text-[13px] leading-snug">
                {question.content.situation}
              </p>
              <Select
                aria-label={`Anzeige für Situation ${number}`}
                options={options}
                value={value ?? ""}
                onChange={(event) =>
                  setAnswer(question.id, event.target.value || null)
                }
                placeholder="–"
                className="w-56 shrink-0"
              />
            </div>
          );
        })}
      </Card>
    </div>
  );
}
