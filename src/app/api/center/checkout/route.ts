import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CENTER_SEAT_PRICE } from "@/config/pricing";
import { prepareCenterPurchase, quoteErrorResponse } from "@/lib/center-purchase";
import { createFlutterwavePayment } from "@/lib/payments/flutterwave";
import { stripe } from "@/lib/payments/stripe";

const schema = z.object({
  provider: z.enum(["stripe", "flutterwave"]),
  // Tant que le centre a des sièges actifs : « renew » ou « add ».
  mode: z.enum(["renew", "add"]).optional(),
  seats: z
    .number()
    .int()
    .min(CENTER_SEAT_PRICE.minSeats)
    .max(CENTER_SEAT_PRICE.maxSeats),
});

/**
 * Achat de sièges (quota d'étudiants) — paiement CENTER par carte (Stripe)
 * ou Mobile Money (Flutterwave). SELF-SERVICE : accessible à tout utilisateur
 * connecté ; au webhook, l'acheteur est promu CENTER_ADMIN, son centre est
 * créé si besoin et une dotation de sièges datée est créée.
 *
 * Trois cas, décidés par le serveur (lib/center-pricing.ts) : nouveau,
 * renouvellement (période suivante, prix plein) ou ajout de sièges jusqu'à
 * la fin de la période en cours (au prorata).
 */
export async function POST(request: Request) {
  const session = await auth();
  const user = session?.user;
  if (!user?.id || !user.email) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Angaben." }, { status: 400 });
  }
  const { provider, seats, mode } = parsed.data;
  const origin = new URL(request.url).origin;

  // Devis calculé par le SERVEUR sur l'état réel des sièges : le navigateur
  // ne choisit que le nombre de places et « renouveler » / « ajouter ».
  const currency = provider === "stripe" ? "EUR" : "XAF";
  const result = await prepareCenterPurchase({
    userId: user.id,
    seats,
    requested: mode,
    currency,
  });
  if (!result.ok) {
    const failure = quoteErrorResponse(result);
    return NextResponse.json(failure.body, { status: failure.status });
  }
  const { quote } = result;
  const periodDays = quote.mode === "ADD" ? quote.billedDays : null;
  const label =
    quote.mode === "ADD"
      ? `${seats} zusätzliche Plätze bis ${quote.expiresAt.toLocaleDateString("de-DE")} (anteilig)`
      : quote.mode === "RENEW"
        ? `${seats} Plätze – Verlängerung ab ${quote.startsAt.toLocaleDateString("de-DE")} (30 Tage)`
        : `${seats} Plätze (30 Tage)`;

  try {
    if (provider === "stripe") {
      const checkout = await stripe().checkout.sessions.create({
        mode: "payment",
        customer_email: user.email,
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "eur",
              unit_amount: Math.round(quote.amount * 100),
              product_data: { name: `TELC Simulator Pro — Zentrum: ${label}` },
            },
          },
        ],
        metadata: {
          userId: user.id,
          plan: "CENTER",
          seats: String(seats),
          centerMode: quote.mode,
        },
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
          centerMode: quote.mode,
          periodDays,
          amount: quote.amount,
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
        centerMode: quote.mode,
        periodDays,
        amount: quote.amount,
        currency: "XAF",
        status: "PENDING",
      },
    });
    const link = await createFlutterwavePayment({
      txRef,
      amount: quote.amount,
      currency: "XAF",
      redirectUrl: `${origin}/center?payment=success`,
      email: user.email,
      name: user.name ?? user.email,
      meta: {
        userId: user.id,
        plan: "CENTER",
        seats: String(seats),
        centerMode: quote.mode,
      },
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
