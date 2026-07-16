"use client";

import { useState } from "react";
import { Card } from "@/components/ui";
import { flushAnswers } from "@/hooks/useAutosave";
import { useWordCount } from "@/hooks/useWordCount";
import { useExamSessionStore } from "@/stores/examSessionStore";
import type { ContentQuestion, WritingContent } from "@/types/question-content";

export interface WritingTaskProps {
  sessionId: string;
  question: ContentQuestion<WritingContent>;
  /** Libellé officiel : "Aufgabe A" / "Aufgabe B". */
  label: string;
}

/**
 * Schreiben — éditeur MINIMAL (ARCHITECTURE.md §6) : une zone de texte,
 * un compteur de mots, rien d'autre. Fidèle au logiciel d'examen :
 * pas de correcteur orthographique, pas de barre de mise en forme,
 * collage désactivé (le texte doit être produit, pas importé).
 * Sauvegarde : chaque frappe passe par setAnswer (circuit autosave 2 s),
 * et la sortie du champ (blur) déclenche une écriture immédiate.
 */
export function WritingTask({ sessionId, question, label }: WritingTaskProps) {
  const value = useExamSessionStore(
    (state) => state.answers[question.id] ?? "",
  );
  const setAnswer = useExamSessionStore((state) => state.setAnswer);
  const [pasteBlocked, setPasteBlocked] = useState(false);

  const text = value ?? "";
  const wordCount = useWordCount(text);
  const minWords = question.content.minWords;
  const reachedMin = minWords !== undefined && wordCount >= minWords;

  return (
    <Card className="p-4">
      <h2 className="text-[14px] font-semibold">{label}</h2>
      <p className="mt-2 leading-relaxed">{question.content.prompt}</p>

      {question.content.bulletPoints.length > 0 ? (
        <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px]">
          {question.content.bulletPoints.map((point, index) => (
            <li key={index}>{point}</li>
          ))}
        </ul>
      ) : null}

      <textarea
        aria-label={`Text für ${label}`}
        value={text}
        onChange={(event) =>
          setAnswer(question.id, event.target.value || null)
        }
        onBlur={() => flushAnswers(sessionId)}
        onPaste={(event) => {
          event.preventDefault();
          setPasteBlocked(true);
        }}
        spellCheck={false}
        autoCorrect="off"
        autoComplete="off"
        className={
          "mt-4 min-h-64 w-full resize-y border border-border bg-background " +
          "p-3 text-[14px] leading-relaxed rounded-sm " +
          "focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        }
      />

      <div className="mt-1.5 flex items-baseline justify-between text-[12px]">
        <span className="text-muted">
          {pasteBlocked
            ? "Einfügen ist in der Prüfung deaktiviert."
            : "\u00A0"}
        </span>
        <span
          className={
            "font-mono tabular-nums " +
            (reachedMin ? "text-foreground" : "text-muted")
          }
        >
          {wordCount} {wordCount === 1 ? "Wort" : "Wörter"}
          {minWords !== undefined ? ` · empfohlen: mind. ${minWords}` : ""}
        </span>
      </div>
    </Card>
  );
}
