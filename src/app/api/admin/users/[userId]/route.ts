import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

const patchSchema = z.object({
  role: z.enum(["STUDENT", "CENTER_ADMIN", "SUPER_ADMIN"]).optional(),
  plan: z.enum(["FREE", "STUDENT", "CENTER", "PREMIUM"]).optional(),
});

/** Modification du rôle / plan. Un admin ne peut pas se rétrograder lui-même. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const { userId } = await params;
  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Angaben ungültig." }, { status: 400 });
  }
  if (userId === session.user?.id && parsed.data.role) {
    return NextResponse.json(
      { error: "Eigene Rolle kann nicht geändert werden." },
      { status: 400 },
    );
  }
  await db.user.update({ where: { id: userId }, data: parsed.data });
  return NextResponse.json({ ok: true });
}

/** Suppression d'un compte (cascade sessions). Pas d'auto-suppression. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> },
) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const { userId } = await params;
  if (userId === session.user?.id) {
    return NextResponse.json(
      { error: "Eigenes Konto kann nicht gelöscht werden." },
      { status: 400 },
    );
  }
  await db.user.delete({ where: { id: userId } });
  return NextResponse.json({ ok: true });
}
