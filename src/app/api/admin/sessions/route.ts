import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/**
 * Sessions d'un candidat (recherche par e-mail exact), pour le support :
 * statut, débit de crédit et remboursement éventuel. Administrateur seulement.
 */
export async function GET(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const email = new URL(request.url).searchParams.get("email")?.trim().toLowerCase();
  if (!email) {
    return NextResponse.json({ error: "E-Mail erforderlich." }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { email },
    select: { id: true, email: true, name: true, credits: true },
  });
  if (!user) return NextResponse.json({ user: null, sessions: [] });

  const sessions = await db.examSession.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      status: true,
      startedAt: true,
      creditStatus: true,
      exam: { select: { title: true } },
    },
  });
  const refunds = await db.creditAdjustment.findMany({
    where: { sessionId: { in: sessions.map((session) => session.id) } },
    select: { sessionId: true, reason: true, createdAt: true },
  });
  const refundBySession = new Map(refunds.map((refund) => [refund.sessionId, refund]));

  return NextResponse.json({
    user,
    sessions: sessions.map((session) => ({
      id: session.id,
      exam: session.exam.title,
      status: session.status,
      startedAt: session.startedAt?.getTime() ?? null,
      creditStatus: session.creditStatus,
      refund: refundBySession.get(session.id)
        ? {
            reason: refundBySession.get(session.id)!.reason,
            at: refundBySession.get(session.id)!.createdAt.getTime(),
          }
        : null,
    })),
  });
}
