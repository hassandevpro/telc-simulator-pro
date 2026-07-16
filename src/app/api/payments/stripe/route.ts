import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanPrice } from "@/config/pricing";
import { stripe } from "@/lib/payments/stripe";

const schema = z.object({ plan: z.enum(["STUDENT", "PREMIUM"]) });

/**
 * Ouvre une session Stripe Checkout (paiement ponctuel, 30 jours d'accès)
 * et renvoie l'URL de règlement hébergée. L'activation du plan se fait au
 * webhook `checkout.session.completed`, jamais sur le retour navigateur.
 */
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültiger Plan." }, { status: 400 });
  }
  const price = getPlanPrice(parsed.data.plan);
  if (!price) {
    return NextResponse.json({ error: "Ungültiger Plan." }, { status: 400 });
  }

  const origin = new URL(request.url).origin;

  try {
    const checkout = await stripe().checkout.sessions.create({
      mode: "payment",
      customer_email: user.email,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            unit_amount: Math.round(price.eur * 100),
            product_data: {
              name: `TELC Simulator Pro — ${price.label} (30 Tage)`,
            },
          },
        },
      ],
      metadata: { userId: user.id, plan: price.plan },
      success_url: `${origin}/dashboard?payment=success`,
      cancel_url: `${origin}/pricing?payment=cancel`,
    });

    await db.payment.create({
      data: {
        userId: user.id,
        provider: "STRIPE",
        providerRef: checkout.id,
        plan: price.plan,
        amount: price.eur,
        currency: "EUR",
        status: "PENDING",
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (cause) {
    console.error("[payments/stripe] init", cause);
    return NextResponse.json(
      { error: "Zahlung derzeit nicht möglich." },
      { status: 500 },
    );
  }
}
