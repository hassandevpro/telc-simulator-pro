import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { submitSession } from "@/lib/session-lifecycle";

/**
 * Remise DÉFINITIVE d'une session : clôture, correction serveur des réponses
 * persistées et écriture du résultat, en une transaction
 * (lib/session-lifecycle.ts). Idempotente : une seconde remise renvoie le
 * résultat déjà calculé, sans recorriger.
 *
 * Aucun corps n'est lu : ni réponses, ni score, ni statut ne viennent du
 * client. Les clés de correction ne quittent jamais le serveur — seul le
 * SessionScore agrégé (points par Teil/section) redescend.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { sessionId } = await params;

  const result = await submitSession(sessionId, userId);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status },
    );
  }
  return NextResponse.json(result.score);
}
