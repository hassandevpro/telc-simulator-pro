"use client";

import { Card } from "@/components/ui";
import { useExamSessionStore } from "@/stores/examSessionStore";
import type {
  ContentQuestion,
  MultipleChoiceContent,
  MultipleChoiceShared,
} from "@/types/question-content";

export interface MultipleChoiceProps {
  shared: MultipleChoiceShared;
  questions: ContentQuestion<MultipleChoiceContent>[];
  startNumber: number;
}

/**
 * QCM générique — sert Lesen Teil 2, Hören Teil 1–3 et Sprachbausteine
 * Teil 2 (un composant par TYPE, jamais par Teil).
 * Avec texte source (Lesen Teil 2) : deux colonnes sur desktop, texte à
 * gauche (sticky), questions à droite — zone de lecture maximale.
 * Sans texte source (Hören, Sprachbausteine) : questions pleine largeur.
 * Boutons radio natifs, fidèles au logiciel d'examen.
 */
export function MultipleChoice({
  shared,
  questions,
  startNumber,
}: MultipleChoiceProps) {
  const answers = useExamSessionStore((state) => state.answers);
  const setAnswer = useExamSessionStore((state) => state.setAnswer);

  const questionList = (
    <div className="space-y-4">
      {questions.map((question, index) => {
        const number = startNumber + index;
        const value = answers[question.id] ?? "";
        return (
          <Card key={question.id} className="p-4">
            <fieldset>
              <legend className="flex gap-3 text-[14px] font-medium">
                <span className="font-semibold">{number}</span>
                <span>{question.content.question}</span>
              </legend>
              <div className="mt-2.5 space-y-1.5 pl-6">
                {question.content.options.map((option) => (
                  <label
                    key={option.id}
                    className="flex cursor-pointer items-baseline gap-2.5 text-[13px]"
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option.id}
                      checked={value === option.id}
                      onChange={() => setAnswer(question.id, option.id)}
                      className="translate-y-0.5 accent-accent"
                    />
                    {/^[a-z]$/i.test(option.id) ? (
                      <span className="w-4 shrink-0 text-muted">
                        {option.id})
                      </span>
                    ) : null}
                    <span>{option.text}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div>
      {shared.instructions ? (
        <p className="mb-4 text-[13px] italic text-muted">
          {shared.instructions}
        </p>
      ) : null}

      {shared.sourceText ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card muted className="self-start p-4 lg:sticky lg:top-16">
            <div className="whitespace-pre-line leading-relaxed">
              {shared.sourceText}
            </div>
          </Card>
          {questionList}
        </div>
      ) : (
        questionList
      )}
    </div>
  );
}
