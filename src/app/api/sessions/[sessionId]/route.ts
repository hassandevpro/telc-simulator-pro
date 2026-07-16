import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildSessionState } from "@/lib/session-server";
import { Prisma } from "@/generated/prisma/client";

/**
 * Session unique — lecture, mutations ciblées (autosave, statut, audio) et
 * suppression. Chaque opération vérifie que la session appartient bien à
 * l'utilisateur connecté (cloisonnement serveur, aucune fuite entre comptes).
 */

async function requireOwnedSession(
  sessionId: string,
): Promise<{ userId: string } | NextResponse> {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    select: { userId: true },
  });
  // 404 (pas 403) si la session n'est pas la sienne : on ne révèle pas son
  // existence.
  if (!row || row.userId !== userId) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  return { userId };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const guard = await requireOwnedSession(sessionId);
  if (guard instanceof NextResponse) return guard;

  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: { select: { level: true } },
      answers: { select: { questionId: true, value: true, updatedAt: true } },
      result: { select: { sectionScores: true, createdAt: true } },
    },
  });
  if (!row) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }
  return NextResponse.json(buildSessionState(row));
}

const patchSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("answers"),
    answers: z.record(z.string(), z.string().nullable()),
  }),
  z.object({
    op: z.literal("status"),
    status: z.enum(["IN_PROGRESS", "SUBMITTED", "EXPIRED", "SCORED"]),
  }),
  z.object({ op: z.literal("audio"), audioId: z.string().min(1) }),
]);

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const guard = await requireOwnedSession(sessionId);
  if (guard instanceof NextResponse) return guard;

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }
  const body = parsed.data;

  if (body.op === "answers") {
    for (const [questionId, value] of Object.entries(body.answers)) {
      if (value === null) {
        await db.answer
          .delete({ where: { sessionId_questionId: { sessionId, questionId } } })
          .catch(() => undefined);
        continue;
      }
      const jsonValue = value as Prisma.InputJsonValue;
      await db.answer
        .upsert({
          where: { sessionId_questionId: { sessionId, questionId } },
          create: { sessionId, questionId, value: jsonValue },
          update: { value: jsonValue },
        })
        .catch(() => undefined);
    }
    return NextResponse.json({ ok: true });
  }

  if (body.op === "status") {
    // La clôture (SUBMITTED/EXPIRED) pose submittedAt une seule fois.
    const closing = body.status === "SUBMITTED" || body.status === "EXPIRED";
    await db.examSession.update({
      where: { id: sessionId },
      data: {
        status: body.status,
        ...(closing ? { submittedAt: new Date() } : {}),
      },
    });
    return NextResponse.json({ ok: true });
  }

  // op === "audio" : ajoute l'id à la liste des audios consommés (idempotent).
  const current = await db.examSession.findUnique({
    where: { id: sessionId },
    select: { audioPlayed: true },
  });
  const played = Array.isArray(current?.audioPlayed)
    ? (current.audioPlayed as string[])
    : [];
  if (!played.includes(body.audioId)) {
    await db.examSession.update({
      where: { id: sessionId },
      data: { audioPlayed: [...played, body.audioId] as Prisma.InputJsonValue },
    });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const { sessionId } = await params;
  const guard = await requireOwnedSession(sessionId);
  if (guard instanceof NextResponse) return guard;

  await db.examSession.delete({ where: { id: sessionId } });
  return NextResponse.json({ ok: true });
}
