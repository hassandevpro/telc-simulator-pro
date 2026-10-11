import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { activeSeats } from "@/lib/center-seats";
import { db } from "@/lib/db";

const schema = z.object({ code: z.string().min(4) });

/**
 * Adhésion d'un étudiant à un centre via sa clé d'invitation. Contrôles :
 * clé valide, quota de sièges ACTIFS non dépassé, pas déjà membre, pas le
 * propriétaire.
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
    select: { id: true, name: true, ownerId: true },
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

  // Contrôle du quota ET adhésion dans une transaction qui VERROUILLE la
  // ligne du centre : deux adhésions simultanées pour la dernière place ne
  // peuvent pas passer toutes les deux.
  const outcome = await db.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT "id" FROM "Center" WHERE "id" = ${center.id} FOR UPDATE`;

    const me = await tx.user.findUnique({
      where: { id: userId },
      select: { centerId: true },
    });
    if (me?.centerId === center.id) return "ALREADY" as const;

    const [seats, members] = await Promise.all([
      activeSeats(tx, center.id),
      tx.user.count({ where: { centerId: center.id } }),
    ]);
    if (members >= seats) return "FULL" as const;

    await tx.user.update({
      where: { id: userId },
      data: { centerId: center.id, centerJoinedAt: new Date() },
    });
    return "JOINED" as const;
  });

  if (outcome === "ALREADY") {
    return NextResponse.json({ ok: true, alreadyMember: true });
  }
  if (outcome === "FULL") {
    return NextResponse.json(
      { error: "Das Zentrum hat keine freien Plätze mehr." },
      { status: 409 },
    );
  }
  return NextResponse.json({ ok: true, centerName: center.name });
}
