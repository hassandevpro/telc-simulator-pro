import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

const patchSchema = z.object({
  title: z.string().min(3).max(200).optional(),
  isPublished: z.boolean().optional(),
});

/** Renommage / publication d'un examen. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const { examId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Angaben ungültig." }, { status: 400 });
  }
  await db.exam.update({ where: { id: examId }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

/** Suppression (cascade : parts, questions). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ examId: string }> },
) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const { examId } = await params;
  await db.exam.delete({ where: { id: examId } });
  return NextResponse.json({ ok: true });
}
