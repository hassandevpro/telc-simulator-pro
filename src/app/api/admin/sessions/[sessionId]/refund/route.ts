import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAdmin } from "@/lib/admin-guard";
import { refundSessionCredit } from "@/lib/credit-refund";

const schema = z.object({ reason: z.string().trim().min(3).max(500) });

/**
 * Remboursement MANUEL d'un crédit d'examen — administrateur uniquement
 * (rôle relu en base). Voir lib/credit-refund.ts pour les garanties.
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const admin = await requireAdmin();
  if (!admin?.user?.id) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Begründung erforderlich." }, { status: 400 });
  }
  const { sessionId } = await params;

  const result = await refundSessionCredit({
    sessionId,
    adminId: admin.user.id,
    reason: parsed.data.reason,
  });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json({ ok: true, amount: result.amount });
}
