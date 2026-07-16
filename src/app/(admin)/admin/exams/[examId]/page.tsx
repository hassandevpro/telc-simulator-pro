import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/ui";
import { EXAM_STRUCTURES } from "@/config/exam-structure";
import { db } from "@/lib/db";

/** Vue d'un examen : ses 10 Teile, leur état de contenu, liens éditeur. */
export default async function AdminExamDetailPage({
  params,
}: {
  params: Promise<{ examId: string }>;
}) {
  const { examId } = await params;

  const exam = await db.exam
    .findUnique({
      where: { id: examId },
      include: {
        parts: { include: { _count: { select: { questions: true } } } },
      },
    })
    .catch(() => null);
  if (!exam) notFound();

  const structure = EXAM_STRUCTURES.B2;
  const partByKey = new Map(
    exam.parts.map((part) => [`${part.sectionId}/${part.partId}`, part]),
  );

  return (
    <section>
      <h1 className="text-xl font-semibold">{exam.title}</h1>
      <p className="mt-1 text-[13px] text-muted">
        {exam.level} · {exam.isPublished ? "veröffentlicht" : "Entwurf"} ·{" "}
        <Link href="/admin/exams" className="text-accent underline underline-offset-2">
          zurück zur Liste
        </Link>
      </p>

      <div className="mt-4 space-y-4">
        {structure.schriftlichePruefung.sections.map((section) => (
          <Card key={section.id} className="divide-y divide-border">
            <p className="px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted">
              {section.label}
            </p>
            {section.parts.map((part) => {
              const dbPart = partByKey.get(`${section.id}/${part.id}`);
              const count = dbPart?._count.questions ?? 0;
              return (
                <div
                  key={part.id}
                  className="flex items-center justify-between px-4 py-2.5 text-[13px]"
                >
                  <span>
                    {part.label}
                    <span className="ml-2 text-[12px] text-muted">
                      {part.questionType} · {count}/{part.itemCount} Fragen
                      {dbPart?.audioUrl ? " · Audio ✓" : ""}
                    </span>
                  </span>
                  <Link
                    href={`/admin/exams/${examId}/${section.id}/${part.id}`}
                    className="text-accent underline underline-offset-2"
                  >
                    Bearbeiten
                  </Link>
                </div>
              );
            })}
          </Card>
        ))}
      </div>
    </section>
  );
}
