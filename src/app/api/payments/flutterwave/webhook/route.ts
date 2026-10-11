import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activatePlanByRef } from "@/lib/billing";
import { verifyFlutterwaveTransaction } from "@/lib/payments/flutterwave";
import { verifySharedSecret } from "@/lib/payments/webhook-signature";

/**
 * Webhook Flutterwave. Deux gardes avant d'activer :
 *  1. la signature `verif-hash` doit égaler FLW_SECRET_HASH ;
 *  2. la transaction est RE-VÉRIFIÉE côté serveur (statut successful), et le
 *     montant/devise sont recroisés avec le paiement en attente.
 * Idempotent (activatePlanByRef). Répond 200 quand la décision est prise
 * (activé, ou refus définitif), et 503 quand elle n'a PAS pu l'être (API de
 * vérification injoignable, base indisponible) : Flutterwave rejoue alors le
 * webhook au lieu de clôturer un paiement peut-être valide.
 */
export async function POST(request: Request) {
  // Comparaison à temps constant (lib/payments/webhook-signature.ts).
  if (
    !verifySharedSecret(
      request.headers.get("verif-hash"),
      process.env.FLW_SECRET_HASH,
    )
  ) {
    return NextResponse.json({ error: "Signatur ungültig." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    data?: { id?: number | string; tx_ref?: string; status?: string };
  } | null;
  const id = body?.data?.id;
  const status = body?.data?.status;

  if (status === "successful" && id !== undefined) {
    try {
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
    } catch (cause) {
      console.error("[flutterwave/webhook] vérification impossible", cause);
      return NextResponse.json(
        { error: "Vorübergehend nicht verfügbar." },
        { status: 503 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
