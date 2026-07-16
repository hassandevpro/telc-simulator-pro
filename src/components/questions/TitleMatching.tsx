"use client";

import { Card, Select } from "@/components/ui";
import { useExamSessionStore } from "@/stores/examSessionStore";
import type {
  ContentQuestion,
  TitleMatchingContent,
  TitleMatchingShared,
} from "@/types/question-content";

export interface TitleMatchingProps {
  shared: TitleMatchingShared;
  questions: ContentQuestion<TitleMatchingContent>[];
  startNumber: number;
}

/**
 * Lesen Teil 1 — 5 textes, 10 titres proposés (5 distracteurs).
 * Chaque texte porte UN dropdown contenant les 10 titres ; la banque des
 * titres est affichée en tête pour la lecture d'ensemble, comme dans le
 * livret officiel.
 */
export function TitleMatching({
  shared,
  questions,
  startNumber,
}: TitleMatchingProps) {
  const answers = useExamSessionStore((state) => state.answers);
  const setAnswer = useExamSessionStore((state) => state.setAnswer);

  const options = shared.titles.map((title) => ({
    value: title.id,
    label: `${title.id})  ${title.text}`,
  }));

  return (
    <div>
      {shared.instructions ? (
        <p className="mb-4 text-[13px] italic text-muted">
          {shared.instructions}
        </p>
      ) : null}

      <Card muted className="mb-6 px-4 py-3">
        <ol className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
          {shared.titles.map((title) => (
            <li key={title.id} className="flex gap-2 text-[13px]">
              <span className="w-4 shrink-0 font-medium">{title.id})</span>
              <span>{title.text}</span>
            </li>
          ))}
        </ol>
      </Card>

      <div className="space-y-5">
        {questions.map((question, index) => {
          const number = startNumber + index;
          const value = answers[question.id] ?? "";
          return (
            <Card key={question.id} className="p-4">
              <div className="flex gap-3">
                <span className="text-[13px] font-semibold">{number}</span>
                <div className="flex-1">
                  <p className="leading-relaxed">{question.content.text}</p>
                  <div className="mt-3 flex items-center gap-2">
                    <label
                      htmlFor={question.id}
                      className="text-[12px] uppercase tracking-wide text-muted"
                    >
                      Überschrift
                    </label>
                    <Select
                      id={question.id}
                      options={options}
                      value={value ?? ""}
                      onChange={(event) =>
                        setAnswer(question.id, event.target.value || null)
                      }
                      className="max-w-md"
                    />
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
