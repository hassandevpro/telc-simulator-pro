import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activatePlanByRef } from "@/lib/billing";
import { verifyFlutterwaveTransaction } from "@/lib/payments/flutterwave";

/**
 * Webhook Flutterwave. Deux gardes avant d'activer :
 *  1. la signature `verif-hash` doit égaler FLW_SECRET_HASH ;
 *  2. la transaction est RE-VÉRIFIÉE côté serveur (statut successful), et le
 *     montant/devise sont recroisés avec le paiement en attente.
 * Idempotent. Répond toujours 200 pour éviter les rejeux inutiles.
 */
export async function POST(request: Request) {
  const expected = process.env.FLW_SECRET_HASH;
  const signature = request.headers.get("verif-hash");
  if (!expected || signature !== expected) {
    return NextResponse.json({ error: "Signatur ungültig." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    data?: { id?: number | string; tx_ref?: string; status?: string };
  } | null;
  const id = body?.data?.id;
  const status = body?.data?.status;

  if (status === "successful" && id !== undefined) {
    const verified = await verifyFlutterwaveTransaction(String(id));
    if (verified && verified.status === "successful") {
      const payment = await db.payment.findUnique({
        where: { providerRef: verified.txRef },
      });
      // Recroise montant/devise : un webhook forgé ne doit pas créditer un
      // plan sans un paiement réel correspondant.
      if (
        payment &&
        verified.currency === payment.currency &&
        verified.amount >= payment.amount
      ) {
        await activatePlanByRef(verified.txRef);
      }
    }
  }

  return NextResponse.json({ received: true });
}
