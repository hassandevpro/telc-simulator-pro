import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

/**
 * Lecture du résultat d'une session REMISE — en lecture seule.
 *
 * Historique : cette route corrigeait à la demande toute session démarrée.
 * C'était un oracle sur le corrigé (modifier une réponse, recorriger,
 * comparer) et un moyen d'obtenir son score sans jamais remettre la copie,
 * donc sans débit de crédit. La correction a lieu désormais UNE fois, à la
 * remise (POST /api/sessions/{id}/submit) ; cette route ne fait que relire
 * le résultat stocké, et refuse tant que la session n'est pas remise.
 */

const payloadSchema = z.object({ sessionId: z.string().min(1) });

export async function POST(request: Request) {
  const authSession = await auth();
  const userId = authSession?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Payload invalide." }, { status: 400 });
  }

  const row = await db.examSession.findUnique({
    where: { id: parsed.data.sessionId },
    select: {
      userId: true,
      status: true,
      result: { select: { sectionScores: true } },
    },
  });
  // Session inconnue OU appartenant à quelqu'un d'autre : même réponse.
  if (!row || row.userId !== userId) {
    return NextResponse.json({ error: "Nicht gefunden." }, { status: 404 });
  }

  if (row.status !== "SCORED" || !row.result) {
    return NextResponse.json(
      {
        error: "Die Prüfung wurde noch nicht abgegeben.",
        code: "NOT_SUBMITTED",
      },
      { status: 409 },
    );
  }
  return NextResponse.json(row.result.sectionScores);
}
