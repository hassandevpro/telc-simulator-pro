"use client";

import { Card, Select } from "@/components/ui";
import { useExamSessionStore } from "@/stores/examSessionStore";
import type {
  ClozeDropdownContent,
  ClozeDropdownShared,
  ContentQuestion,
} from "@/types/question-content";

export interface ClozeDropdownProps {
  shared: ClozeDropdownShared;
  questions: ContentQuestion<ClozeDropdownContent>[];
  startNumber: number;
}

const GAP_PATTERN = /(\{\{\d+\}\})/g;

/**
 * Sprachbausteine — menus déroulants INSÉRÉS dans le texte à trous.
 * Les lacunes sont notées {{1}} … {{n}} dans le texte partagé ; chacune
 * est remplacée par son numéro officiel + un dropdown inline.
 * Deux variantes servies par le même composant :
 *  - Teil 1 : options propres à chaque lacune (a/b/c) ;
 *  - Teil 2 : banque de mots commune (shared.wordBank, A–O), affichée
 *    au-dessus du texte comme dans le livret officiel.
 */
export function ClozeDropdown({
  shared,
  questions,
  startNumber,
}: ClozeDropdownProps) {
  const answers = useExamSessionStore((state) => state.answers);
  const setAnswer = useExamSessionStore((state) => state.setAnswer);

  const questionByGap = new Map(
    questions.map((question) => [question.content.gapIndex, question]),
  );

  const segments = shared.text.split(GAP_PATTERN);

  return (
    <div>
      {shared.instructions ? (
        <p className="mb-4 text-[13px] italic text-muted">
          {shared.instructions}
        </p>
      ) : null}

      {shared.wordBank ? (
        <Card muted className="mb-6 px-4 py-3">
          <ol className="grid gap-x-6 gap-y-1 sm:grid-cols-3">
            {shared.wordBank.map((word) => (
              <li key={word.id} className="flex gap-2 text-[13px]">
                <span className="w-4 shrink-0 font-medium">{word.id}</span>
                <span>{word.text}</span>
              </li>
            ))}
          </ol>
        </Card>
      ) : null}

      <Card className="p-5">
        <div className="whitespace-pre-line text-[14px] leading-9">
          {segments.map((segment, index) => {
            const match = segment.match(/^\{\{(\d+)\}\}$/);
            if (!match) {
              return <span key={index}>{segment}</span>;
            }

            const gapIndex = Number(match[1]);
            const question = questionByGap.get(gapIndex);
            if (!question) {
              // Contenu incohérent (lacune sans question) : visible en
              // création de contenu, jamais silencieux.
              return (
                <span key={index} className="text-danger">
                  [{gapIndex}?]
                </span>
              );
            }

            const number = startNumber + gapIndex - 1;
            const value = answers[question.id] ?? "";
            const source =
              question.content.options.length > 0
                ? question.content.options
                : (shared.wordBank ?? []);
            const options = source.map((option) => ({
              value: option.id,
              label: `${option.id})  ${option.text}`,
            }));

            return (
              <span
                key={index}
                className="mx-1 inline-flex items-baseline gap-1 align-baseline"
              >
                <span className="text-[11px] font-semibold text-muted">
                  {number}
                </span>
                <Select
                  aria-label={`Lücke ${number}`}
                  options={options}
                  value={value ?? ""}
                  onChange={(event) =>
                    setAnswer(question.id, event.target.value || null)
                  }
                  placeholder="–"
                />
              </span>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
