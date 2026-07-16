import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { requireCenterAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { CENTER_SEAT_PRICE, centerAmount } from "@/config/pricing";
import { createFlutterwavePayment } from "@/lib/payments/flutterwave";
import { stripe } from "@/lib/payments/stripe";

const schema = z.object({
  provider: z.enum(["stripe", "flutterwave"]),
  seats: z
    .number()
    .int()
    .min(CENTER_SEAT_PRICE.minSeats)
    .max(CENTER_SEAT_PRICE.maxSeats),
});

/**
 * Achat de sièges (quota d'étudiants) pour le centre — paiement CENTER par
 * carte (Stripe) ou Mobile Money (Flutterwave). Les sièges sont crédités au
 * webhook. Réservé au CENTER_ADMIN disposant déjà d'un centre.
 */
export async function POST(request: Request) {
  const session = await requireCenterAdmin();
  const user = session?.user;
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  const center = await db.center.findUnique({ where: { ownerId: user.id } });
  if (!center) {
    return NextResponse.json(
      { error: "Erstellen Sie zuerst Ihr Zentrum." },
      { status: 400 },
    );
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Angaben." }, { status: 400 });
  }
  const { provider, seats } = parsed.data;
  const origin = new URL(request.url).origin;

  try {
    if (provider === "stripe") {
      const checkout = await stripe().checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [
          {
            quantity: seats,
            price_data: {
              currency: "eur",
              unit_amount: Math.round(CENTER_SEAT_PRICE.eur * 100),
              product_data: { name: "TELC Simulator Pro — Zentrum (Platz/30 Tage)" },
            },
          },
        ],
        metadata: { userId: user.id, plan: "CENTER", seats: String(seats) },
        success_url: `${origin}/center?payment=success`,
        cancel_url: `${origin}/center?payment=cancel`,
      });
      await db.payment.create({
        data: {
          userId: user.id,
          provider: "STRIPE",
          providerRef: checkout.id,
          plan: "CENTER",
          seats,
          amount: centerAmount(seats, "EUR"),
          currency: "EUR",
          status: "PENDING",
        },
      });
      return NextResponse.json({ url: checkout.url });
    }

    const txRef = `flw_${randomUUID()}`;
    await db.payment.create({
      data: {
        userId: user.id,
        provider: "FLUTTERWAVE",
        providerRef: txRef,
        plan: "CENTER",
        seats,
        amount: centerAmount(seats, "XAF"),
        currency: "XAF",
        status: "PENDING",
      },
    });
    const link = await createFlutterwavePayment({
      txRef,
      amount: centerAmount(seats, "XAF"),
      currency: "XAF",
      redirectUrl: `${origin}/center?payment=success`,
      email: user.email,
      name: user.name ?? user.email,
      meta: { userId: user.id, plan: "CENTER", seats: String(seats) },
    });
    return NextResponse.json({ url: link });
  } catch (cause) {
    console.error("[center/checkout]", cause);
    return NextResponse.json(
      { error: "Zahlung derzeit nicht möglich." },
      { status: 500 },
    );
  }
}
