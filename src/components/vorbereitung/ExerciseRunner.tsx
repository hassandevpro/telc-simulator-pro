"use client";

import { useMemo, useState } from "react";
import { Button, Card, Select } from "@/components/ui";
import {
  exerciseItemCount,
  type ChoiceExercise,
  type ClozeExercise,
  type Exercise,
} from "@/content/vorbereitung";

/**
 * Exercices d'entraînement de la Vorbereitung.
 *
 * Volontairement SÉPARÉ des composants de `components/questions/` : ceux-ci
 * servent le moteur d'examen (état dans examSessionStore, aucune correction
 * visible, answerKey jamais envoyée au client). Ici c'est l'inverse — état
 * local, correction immédiate, explication affichée. Ce qui est réutilisé,
 * c'est le langage visuel (Card, Select, radios natifs) et la FORME des
 * questions, pas la mécanique d'examen.
 */

/** Clé d'une réponse : `exerciseId` pour un QCM, `exerciseId#gapIndex` sinon. */
type AnswerMap = Record<string, string>;

export interface ExerciseRunnerProps {
  exercises: Exercise[];
  /** Appelé après chaque correction — sert à enregistrer la progression. */
  onScored?: (score: number, maxScore: number) => void;
}

export function ExerciseRunner({ exercises, onScored }: ExerciseRunnerProps) {
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [checked, setChecked] = useState(false);

  const maxScore = useMemo(
    () => exercises.reduce((total, ex) => total + exerciseItemCount(ex), 0),
    [exercises],
  );

  const answeredCount = Object.values(answers).filter(Boolean).length;

  const score = useMemo(() => {
    let correct = 0;
    for (const exercise of exercises) {
      if (exercise.kind === "choice") {
        if (answers[exercise.id] === exercise.answer) correct += 1;
      } else {
        for (const gap of exercise.gaps) {
          if (answers[`${exercise.id}#${gap.index}`] === gap.answer) correct += 1;
        }
      }
    }
    return correct;
  }, [answers, exercises]);

  function setAnswer(key: string, value: string) {
    if (checked) return; // Après correction, les réponses sont figées.
    setAnswers((current) => ({ ...current, [key]: value }));
  }

  function check() {
    setChecked(true);
    onScored?.(score, maxScore);
  }

  function reset() {
    setAnswers({});
    setChecked(false);
  }

  return (
    <div className="space-y-4">
      {exercises.map((exercise, index) =>
        exercise.kind === "choice" ? (
          <ChoiceItem
            key={exercise.id}
            exercise={exercise}
            number={index + 1}
            value={answers[exercise.id] ?? ""}
            checked={checked}
            onChange={(value) => setAnswer(exercise.id, value)}
          />
        ) : (
          <ClozeItem
            key={exercise.id}
            exercise={exercise}
            number={index + 1}
            answers={answers}
            checked={checked}
            onChange={setAnswer}
          />
        ),
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-border pt-4">
        {checked ? (
          <>
            <p className="text-[14px]">
              <span className="font-semibold">
                {score} / {maxScore}
              </span>{" "}
              <span className="text-muted">richtig</span>
            </p>
            <Button onClick={reset}>Noch einmal</Button>
          </>
        ) : (
          <>
            <Button variant="primary" onClick={check} disabled={answeredCount === 0}>
              Antworten prüfen
            </Button>
            <span className="text-[12px] text-muted">
              {answeredCount} von {maxScore} beantwortet
            </span>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- QCM ---------- */

function ChoiceItem({
  exercise,
  number,
  value,
  checked,
  onChange,
}: {
  exercise: ChoiceExercise;
  number: number;
  value: string;
  checked: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <Card className="p-4">
      <fieldset disabled={checked}>
        <legend className="flex gap-3 text-[14px] font-medium">
          <span className="font-semibold">{number}</span>
          <span>{exercise.question}</span>
        </legend>
        <div className="mt-2.5 space-y-1.5 pl-6">
          {exercise.options.map((option) => (
            <label
              key={option.id}
              className={
                "flex cursor-pointer items-baseline gap-2.5 text-[13px] " +
                optionTone(checked, option.id, value, exercise.answer)
              }
            >
              <input
                type="radio"
                name={exercise.id}
                value={option.id}
                checked={value === option.id}
                onChange={() => onChange(option.id)}
                className="translate-y-0.5 accent-accent"
              />
              <span className="w-4 shrink-0 text-muted">{option.id})</span>
              <span>{option.text}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {checked ? (
        <Feedback
          verdict={verdictOf(value, exercise.answer)}
          explanation={exercise.explanation}
        />
      ) : null}
    </Card>
  );
}

/**
 * Une réponse omise n'est pas « fausse » : la distinguer évite de décourager
 * inutilement et reflète ce qui s'est passé.
 */
type Verdict = "correct" | "wrong" | "empty";

function verdictOf(value: string, answer: string): Verdict {
  if (!value) return "empty";
  return value === answer ? "correct" : "wrong";
}

const VERDICT_TONE: Record<Verdict, string> = {
  correct: "text-[#15803d]",
  wrong: "text-danger",
  empty: "text-muted",
};

const VERDICT_LABEL: Record<Verdict, string> = {
  correct: "Richtig",
  wrong: "Falsch",
  empty: "Nicht beantwortet",
};

/** Couleur d'une option après correction : verte si juste, rouge si choisie à tort. */
function optionTone(
  checked: boolean,
  optionId: string,
  value: string,
  answer: string,
): string {
  if (!checked) return "";
  if (optionId === answer) return "text-[#15803d] font-medium";
  if (optionId === value) return "text-danger line-through";
  return "text-muted";
}

/* ---------- Texte à trous ---------- */

const GAP_PATTERN = /\{\{(\d+)\}\}/g;

function ClozeItem({
  exercise,
  number,
  answers,
  checked,
  onChange,
}: {
  exercise: ClozeExercise;
  number: number;
  answers: AnswerMap;
  checked: boolean;
  onChange: (key: string, value: string) => void;
}) {
  // Le texte est découpé une seule fois : segments littéraux et lacunes.
  const segments = useMemo(() => {
    const parts: ({ text: string } | { gapIndex: number })[] = [];
    let lastIndex = 0;
    for (const match of exercise.text.matchAll(GAP_PATTERN)) {
      const at = match.index ?? 0;
      if (at > lastIndex) {
        parts.push({ text: exercise.text.slice(lastIndex, at) });
      }
      parts.push({ gapIndex: Number(match[1]) });
      lastIndex = at + match[0].length;
    }
    if (lastIndex < exercise.text.length) {
      parts.push({ text: exercise.text.slice(lastIndex) });
    }
    return parts;
  }, [exercise.text]);

  return (
    <Card className="p-4">
      <p className="flex gap-3 text-[14px] font-medium">
        <span className="font-semibold">{number}</span>
        <span>{exercise.question}</span>
      </p>

      <p className="mt-3 whitespace-pre-line text-[14px] leading-loose">
        {segments.map((segment, index) => {
          if ("text" in segment) return <span key={index}>{segment.text}</span>;

          const gap = exercise.gaps.find((g) => g.index === segment.gapIndex);
          if (!gap) return null;
          const key = `${exercise.id}#${gap.index}`;
          const value = answers[key] ?? "";

          // Après correction, le menu laisse place au mot choisi, coloré :
          // le texte redevient lisible d'un trait, comme une copie corrigée.
          if (checked) {
            const chosen = gap.options.find((o) => o.id === value)?.text;
            return (
              <span
                key={index}
                className={
                  "mx-1 font-medium underline underline-offset-4 " +
                  VERDICT_TONE[verdictOf(value, gap.answer)]
                }
              >
                {chosen ?? `(${gap.index})`}
              </span>
            );
          }

          return (
            <Select
              key={index}
              aria-label={`Lücke ${gap.index}`}
              value={value}
              onChange={(event) => onChange(key, event.target.value)}
              placeholder={`(${gap.index})`}
              options={gap.options.map((option) => ({
                value: option.id,
                label: option.text,
              }))}
              className="mx-1 align-baseline"
            />
          );
        })}
      </p>

      {checked ? (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          {exercise.gaps.map((gap) => {
            const value = answers[`${exercise.id}#${gap.index}`] ?? "";
            const verdict = verdictOf(value, gap.answer);
            const solution = gap.options.find((o) => o.id === gap.answer)?.text;
            return (
              <div key={gap.index} className="text-[13px]">
                <p className="font-medium">
                  <span className="text-muted">({gap.index}) </span>
                  <span className={VERDICT_TONE[verdict]}>
                    {VERDICT_LABEL[verdict]}
                    {verdict === "correct"
                      ? ` — ${solution}`
                      : ` — richtig ist: ${solution}`}
                  </span>
                </p>
                <p className="text-muted">{gap.explanation}</p>
              </div>
            );
          })}
        </div>
      ) : null}
    </Card>
  );
}

function Feedback({
  verdict,
  explanation,
}: {
  verdict: Verdict;
  explanation: string;
}) {
  return (
    <div className="mt-3 border-t border-border pt-3 text-[13px]">
      <p className={`font-medium ${VERDICT_TONE[verdict]}`}>
        {VERDICT_LABEL[verdict]}
      </p>
      <p className="mt-0.5 text-muted">{explanation}</p>
    </div>
  );
}
