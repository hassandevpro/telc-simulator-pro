import { NextResponse } from "next/server";
import { requireCenterAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/** Retire un étudiant du centre (il perd l'accès via le centre). */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireCenterAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const { userId } = await params;

  const center = await db.center.findUnique({
    where: { ownerId: session.user.id },
    select: { id: true },
  });
  if (!center) {
    return NextResponse.json({ error: "Kein Zentrum." }, { status: 404 });
  }

  // On ne détache QUE des membres de SON centre.
  const result = await db.user.updateMany({
    where: { id: userId, centerId: center.id },
    data: { centerId: null },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Kein Mitglied." }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
