import { notFound } from "next/navigation";
import { WritingTask } from "@/components/questions";
import { EXAM_STRUCTURES, getSection } from "@/config/exam-structure";
import { getPartContent, resolveSessionExamId } from "@/lib/exam-content";

/**
 * Schreiben — les DEUX Aufgaben visibles sur la même page (spécification
 * produit), chacune ancrée (#aufgabe-a / #aufgabe-b) pour la navigation.
 * Consigne officielle : une seule Aufgabe est à traiter — le scoring
 * (Sprint 8) n'évaluera qu'une production.
 */
export default async function SchreibenPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const structure = EXAM_STRUCTURES.B2;

  const section = getSection(structure, "schreiben");
  if (!section) notFound();

  const examId = await resolveSessionExamId(sessionId);
  const parts = await Promise.all(
    section.parts.map(async (part) => ({
      part,
      content: await getPartContent(examId, "schreiben", part.id),
    })),
  );

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-4 border-b border-border pb-3">
        <h1 className="text-base font-semibold">Schriftlicher Ausdruck</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Bearbeitungszeit: 30 Minuten (innerhalb der Gesamtzeit)
        </p>
      </header>

      <p className="mb-5 text-[13px] italic text-muted">
        Wählen Sie Aufgabe A oder Aufgabe B. Bearbeiten Sie nur EINE der
        beiden Aufgaben. Es wird nur ein Text bewertet.
      </p>

      <div className="space-y-8">
        {parts.map(({ part, content }) => {
          if (!content || content.type !== "WRITING") return null;
          return (
            <section key={part.id} id={part.id} className="scroll-mt-16">
              {content.questions.map((question) => (
                <WritingTask
                  key={question.id}
                  sessionId={sessionId}
                  question={question}
                  label={part.label}
                />
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}
