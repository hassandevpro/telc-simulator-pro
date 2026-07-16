import { notFound } from "next/navigation";
import Link from "next/link";
import { PartEditor } from "@/components/admin";
import { EXAM_STRUCTURES, getPart, getSection } from "@/config/exam-structure";
import type { SectionId } from "@/types/exam";

/** Éditeur d'un Teil : contenu structuré validé par le schéma Zod du type. */
export default async function AdminPartEditorPage({
  params,
}: {
  params: Promise<{ examId: string; sectionId: string; partId: string }>;
}) {
  const { examId, sectionId, partId } = await params;
  const structure = EXAM_STRUCTURES.B2;
  const section = getSection(structure, sectionId as SectionId);
  const part = getPart(structure, sectionId as SectionId, partId);
  if (!section || !part) notFound();

  return (
    <section>
      <h1 className="text-xl font-semibold">
        {section.label} · {part.label}
      </h1>
      <p className="mt-1 text-[13px] text-muted">
        Type : {part.questionType} · {part.itemCount} items attendus ·{" "}
        {part.pointsPerItem} pts/item ·{" "}
        <Link
          href={`/admin/exams/${examId}`}
          className="text-accent underline underline-offset-2"
        >
          zurück zum Examen
        </Link>
      </p>
      <div className="mt-4">
        <PartEditor
          examId={examId}
          sectionId={sectionId}
          partId={partId}
          questionType={part.questionType}
        />
      </div>
    </section>
  );
}
