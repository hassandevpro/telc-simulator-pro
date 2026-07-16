import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

const schema = z.object({ code: z.string().min(4) });

/**
 * Adhésion d'un étudiant à un centre via sa clé d'invitation. Contrôles :
 * clé valide, quota non dépassé, pas déjà membre, pas le propriétaire.
 */
export async function POST(request: Request) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiger Code." }, { status: 400 });
  }

  const center = await db.center.findUnique({
    where: { inviteCode: parsed.data.code },
    include: { _count: { select: { members: true } } },
  });
  if (!center) {
    return NextResponse.json(
      { error: "Ungültiger Einladungscode." },
      { status: 404 },
    );
  }
  if (center.ownerId === userId) {
    return NextResponse.json(
      { error: "Als Zentrumsleitung können Sie nicht beitreten." },
      { status: 400 },
    );
  }

  const me = await db.user.findUnique({
    where: { id: userId },
    select: { centerId: true },
  });
  if (me?.centerId === center.id) {
    return NextResponse.json({ ok: true, alreadyMember: true });
  }
  if (center._count.members >= center.seats) {
    return NextResponse.json(
      { error: "Das Zentrum hat keine freien Plätze mehr." },
      { status: 409 },
    );
  }

  await db.user.update({ where: { id: userId }, data: { centerId: center.id } });
  return NextResponse.json({ ok: true, centerName: center.name });
}
