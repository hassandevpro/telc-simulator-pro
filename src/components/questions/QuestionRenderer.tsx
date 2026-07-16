"use client";

import type { PartStructure } from "@/types/exam";
import type { PartContent } from "@/types/question-content";
import { AdMatching } from "./AdMatching";
import { ClozeDropdown } from "./ClozeDropdown";
import { WritingTask } from "./WritingTask";
import { MultipleChoice } from "./MultipleChoice";
import { TitleMatching } from "./TitleMatching";

export interface QuestionRendererProps {
  sessionId: string;
  part: PartStructure;
  content: PartContent;
  /** Premier numéro d'item dans la numérotation officielle continue. */
  startNumber: number;
}

/**
 * Dispatch par TYPE de question (ARCHITECTURE.md §2) : les pages de Teil
 * ne connaissent que ce composant ; les 5 types couvrent tout l'examen.
 * CLOZE_DROPDOWN (Sprint 4) et WRITING (Sprint 7) arrivent avec leurs
 * modules respectifs.
 */
export function QuestionRenderer({
  sessionId,
  part,
  content,
  startNumber,
}: QuestionRendererProps) {
  switch (content.type) {
    case "TITLE_MATCHING":
      return (
        <TitleMatching
          shared={content.shared}
          questions={content.questions}
          startNumber={startNumber}
        />
      );
    case "MULTIPLE_CHOICE":
      return (
        <MultipleChoice
          shared={content.shared}
          questions={content.questions}
          startNumber={startNumber}
        />
      );
    case "AD_MATCHING":
      return (
        <AdMatching
          shared={content.shared}
          questions={content.questions}
          startNumber={startNumber}
          allowNoAnswer={part.allowNoAnswer}
        />
      );
    case "CLOZE_DROPDOWN":
      return (
        <ClozeDropdown
          shared={content.shared}
          questions={content.questions}
          startNumber={startNumber}
        />
      );
    case "WRITING":
      return (
        <div className="space-y-6">
          {content.questions.map((question) => (
            <WritingTask
              key={question.id}
              sessionId={sessionId}
              question={question}
              label={part.label}
            />
          ))}
        </div>
      );
  }
}
