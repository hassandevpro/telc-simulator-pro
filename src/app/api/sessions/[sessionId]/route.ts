import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildSessionState } from "@/lib/session-server";
import {
  expireIfOverdue,
  expireSession,
  saveSessionAnswers,
  startSession,
  type LifecycleError,
} from "@/lib/session-lifecycle";
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
  // Le temps fait autorité côté SERVEUR : une session dont l'échéance est
  // passée est fermée ici, quoi que le navigateur affiche.
  row.status = (await expireIfOverdue(row)) as typeof row.status;
  return NextResponse.json(buildSessionState(row));
}

const patchSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("answers"),
    answers: z.record(z.string(), z.string().max(20_000).nullable()),
  }),
  z.object({
    op: z.literal("status"),
    status: z.enum(["IN_PROGRESS", "SUBMITTED", "EXPIRED", "SCORED"]),
  }),
  z.object({ op: z.literal("audio"), audioId: z.string().min(1).max(200) }),
]);

function lifecycleError(result: LifecycleError) {
  return NextResponse.json(
    { error: result.error, code: result.code },
    { status: result.status },
  );
}

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
    try {
      const saved = await saveSessionAnswers(sessionId, guard.userId, body.answers);
      if (!saved.ok) return lifecycleError(saved);
      return NextResponse.json(saved);
    } catch (cause) {
      // Échec d'écriture : RIEN n'est conservé (transaction) et le client
      // le sait — il garde ses réponses en attente et réessaie.
      console.error("[sessions/answers] écriture échouée", cause);
      return NextResponse.json(
        { error: "Speichern fehlgeschlagen.", code: "SAVE_FAILED" },
        { status: 503 },
      );
    }
  }

  if (body.op === "status") {
    // Seules transitions demandables : démarrer, fermer. La remise passe par
    // POST /api/sessions/{id}/submit ; aucun retour en arrière.
    if (body.status === "IN_PROGRESS") {
      const started = await startSession(sessionId, guard.userId);
      return started.ok ? NextResponse.json({ ok: true }) : lifecycleError(started);
    }
    if (body.status === "EXPIRED") {
      const expired = await expireSession(sessionId, guard.userId);
      return expired.ok ? NextResponse.json({ ok: true }) : lifecycleError(expired);
    }
    return NextResponse.json(
      {
        error: "Abgabe nur über die Abgabe-Funktion möglich.",
        code: "INVALID_TRANSITION",
      },
      { status: 409 },
    );
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
