import { AbgabeView, type AbgabePartMeta } from "@/components/exam/AbgabeView";
import { EXAM_STRUCTURES } from "@/config/exam-structure";
import { getExamContent, resolveSessionExamId } from "@/lib/exam-content";

/**
 * Remise finale — la page serveur assemble les métadonnées (identifiants
 * de questions par Teil, SANS clés de correction) et délègue au client.
 */
export default async function AbgabePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const structure = EXAM_STRUCTURES.B2;
  const bundle = await getExamContent(await resolveSessionExamId(sessionId));

  const parts: AbgabePartMeta[] = [];
  for (const section of structure.schriftlichePruefung.sections) {
    for (const part of section.parts) {
      const content = bundle?.parts[`${section.id}/${part.id}`];
      if (!content) continue;
      parts.push({
        sectionLabel: section.label,
        partLabel: part.label,
        questionIds: content.questions.map((question) => question.id),
        isWriting: content.type === "WRITING",
      });
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <header className="mb-4 border-b border-border pb-3">
        <h1 className="text-base font-semibold">Abgabe</h1>
        <p className="mt-0.5 text-[12px] text-muted">
          Überprüfen Sie Ihre Antworten, bevor Sie die Prüfung abgeben.
        </p>
      </header>
      <AbgabeView sessionId={sessionId} parts={parts} />
    </div>
  );
}
