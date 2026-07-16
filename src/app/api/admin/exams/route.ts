import { NextResponse } from "next/server";
import { z } from "zod";
import { getStructureForLevel } from "@/config/exam-structure";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(3).max(200),
  level: z.enum(["B1", "B2"]),
});

/** Liste des examens avec compteurs de contenu. */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const exams = await db.exam.findMany({
    orderBy: { createdAt: "desc" },
    include: { parts: { include: { _count: { select: { questions: true } } } } },
  });
  return NextResponse.json(
    exams.map((exam) => ({
      id: exam.id,
      title: exam.title,
      level: exam.level,
      isPublished: exam.isPublished,
      questionCount: exam.parts.reduce(
        (sum, part) => sum + part._count.questions,
        0,
      ),
    })),
  );
}

/**
 * Création d'un examen : les ExamParts sont dérivés AUTOMATIQUEMENT de la
 * structure officielle du niveau — l'admin ne crée jamais la structure,
 * seulement le contenu.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Angaben ungültig." }, { status: 400 });
  }

  const structure = getStructureForLevel(parsed.data.level);
  const exam = await db.exam.create({
    data: { title: parsed.data.title, level: parsed.data.level },
  });
  for (const section of structure.schriftlichePruefung.sections) {
    for (const part of section.parts) {
      await db.examPart.create({
        data: { examId: exam.id, sectionId: section.id, partId: part.id },
      });
    }
  }
  return NextResponse.json({ id: exam.id }, { status: 201 });
}
