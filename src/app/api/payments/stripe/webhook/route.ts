import { NextResponse } from "next/server";
import { activatePlanByRef } from "@/lib/billing";
import { stripe } from "@/lib/payments/stripe";

/**
 * Webhook Stripe — SEULE source d'activation de plan par carte. La signature
 * est vérifiée avec STRIPE_WEBHOOK_SECRET sur le corps BRUT (jamais parsé
 * avant vérification). Idempotent : l'activation ignore un paiement déjà
 * traité.
 */
export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = request.headers.get("stripe-signature");
  if (!secret || !signature) {
    return NextResponse.json({ error: "Signatur fehlt." }, { status: 400 });
  }

  const raw = await request.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch (cause) {
    console.error("[stripe/webhook] signature invalide", cause);
    return NextResponse.json({ error: "Signatur ungültig." }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object as { id: string; payment_status?: string };
    if (checkout.payment_status === "paid" || checkout.payment_status === undefined) {
      await activatePlanByRef(checkout.id);
    }
  }

  return NextResponse.json({ received: true });
}
