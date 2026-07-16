import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { requireCenterAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/** Clé d'invitation courte et URL-safe. */
function newInviteCode(): string {
  return randomBytes(9).toString("base64url"); // ~12 caractères
}

/** Détail du centre géré par le CENTER_ADMIN connecté + ses membres. */
export async function GET() {
  const session = await requireCenterAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const center = await db.center.findUnique({
    where: { ownerId: session.user.id },
    include: {
      members: {
        select: { id: true, email: true, name: true, createdAt: true },
        orderBy: { createdAt: "asc" },
      },
    },
  });
  if (!center) return NextResponse.json({ center: null, members: [] });

  return NextResponse.json({
    center: {
      id: center.id,
      name: center.name,
      inviteCode: center.inviteCode,
      seats: center.seats,
      memberCount: center.members.length,
    },
    members: center.members,
  });
}

const createSchema = z.object({ name: z.string().min(2).max(120) });

/** Création du centre (une seule fois par CENTER_ADMIN). */
export async function POST(request: Request) {
  const session = await requireCenterAdmin();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Name ungültig." }, { status: 400 });
  }

  const existing = await db.center.findUnique({
    where: { ownerId: session.user.id },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Zentrum existiert bereits." },
      { status: 409 },
    );
  }

  const center = await db.center.create({
    data: {
      name: parsed.data.name,
      ownerId: session.user.id,
      inviteCode: newInviteCode(),
    },
  });
  return NextResponse.json({ id: center.id }, { status: 201 });
}
