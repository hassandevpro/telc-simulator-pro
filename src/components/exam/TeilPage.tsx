import { notFound } from "next/navigation";
import { AudioPlayer } from "@/components/exam/AudioPlayer";
import { QuestionRenderer } from "@/components/questions";
import {
  EXAM_STRUCTURES,
  getItemStartNumber,
  getPart,
  getSection,
} from "@/config/exam-structure";
import { requireSessionExam } from "@/lib/exam-access";
import { getPartContent } from "@/lib/exam-content";
import type { SectionId } from "@/types/exam";

export interface TeilPageProps {
  sessionId: string;
  sectionId: SectionId;
  teil: string;
}

/**
 * Page de Teil générique (composant SERVEUR) — partagée par Lesen,
 * Sprachbausteine et (Sprint 5, avec l'AudioPlayer en plus) Hören :
 * résout le Teil dans la structure officielle, charge le contenu
 * (sans clés de correction) et délègue au QuestionRenderer.
 *
 * L'examen servi est celui de la session EN BASE, et l'accès est vérifié
 * côté serveur avant tout chargement de contenu (requireSessionExam) :
 * ni le cookie ni un paramètre client ne peuvent désigner l'examen.
 */
export async function TeilPage({ sessionId, sectionId, teil }: TeilPageProps) {
  const structure = EXAM_STRUCTURES.B2;

  const section = getSection(structure, sectionId);
  const part = getPart(structure, sectionId, teil);
  if (!section || !part) notFound();

  const access = await requireSessionExam(sessionId);
  if (!access) notFound();

  const content = await getPartContent(access.examId, sectionId, teil);
  if (!content || content.type !== part.questionType) notFound();

  const startNumber = getItemStartNumber(structure, sectionId, teil);
  const endNumber = startNumber + part.itemCount - 1;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      <header className="mb-4 border-b border-border pb-3">
        <h1 className="text-base font-semibold">
          {section.label} · {part.label}
        </h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Aufgaben {startNumber}–{endNumber}
        </p>
      </header>
      {content.shared.audioUrl ? (
        <AudioPlayer
          sessionId={sessionId}
          audioId={`${sectionId}/${teil}`}
          src={content.shared.audioUrl}
        />
      ) : null}
      <QuestionRenderer
        sessionId={sessionId}
        part={part}
        content={content}
        startNumber={startNumber}
      />
    </div>
  );
}
