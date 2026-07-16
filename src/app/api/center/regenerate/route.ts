import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { requireCenterAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/**
 * Régénère la clé d'invitation du centre. Les anciens liens cessent alors
 * de fonctionner — utile si une clé a fuité.
 */
export async function POST() {
  const session = await requireCenterAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const center = await db.center.findUnique({
    where: { ownerId: session.user.id },
  });
  if (!center) {
    return NextResponse.json({ error: "Kein Zentrum." }, { status: 404 });
  }
  const inviteCode = randomBytes(9).toString("base64url");
  await db.center.update({ where: { id: center.id }, data: { inviteCode } });
  return NextResponse.json({ inviteCode });
}
