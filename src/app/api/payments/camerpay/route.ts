import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { CENTER_SEAT_PRICE, getPlanPrice } from "@/config/pricing";
import { modeRequiredBody, prepareCenterPurchase } from "@/lib/center-purchase";
import { blockStudentDuringPremium } from "@/lib/plan-purchase";
import {
  CAMERPAY_PAYMENT_METHOD,
  initiateCamerPayPayment,
  normalizeCameroonMsisdn,
} from "@/lib/payments/camerpay";

/**
 * Ouvre un paiement CamerPay (passerelle camerounaise, Mobile Money) en francs
 * CFA et renvoie le lien de règlement.
 *
 * CETTE ROUTE N'ACTIVE RIEN. Elle crée une trace `Payment` PENDING et parle à
 * CamerPay ; le plan, les crédits et les sièges ne sont accordés que par le
 * webhook, après vérification de signature ET relecture serveur. Le retour
 * navigateur n'est qu'un affichage.
 *
 * Couvre STUDENT, PREMIUM et CENTER (achat de sièges au quota). Les routes
 * Stripe et Flutterwave ne sont pas touchées.
 */

const schema = z
  .object({
    plan: z.enum(["STUDENT", "PREMIUM", "CENTER"]),
    // CENTER uniquement — ignoré pour les autres plans.
    // Tant que le centre a des sièges actifs : « renew » (période suivante,
    // à la fin de la période payée) ou « add » (sièges en plus, au prorata).
    mode: z.enum(["renew", "add"]).optional(),
    seats: z
      .number()
      .int()
      .min(CENTER_SEAT_PRICE.minSeats)
      .max(CENTER_SEAT_PRICE.maxSeats)
      .optional(),
    // Numéro du payeur. Facultatif : à défaut on retombe sur User.phone.
    phone: z.string().min(6).max(25).optional(),
  })
  .superRefine((value, ctx) => {
    if (value.plan === "CENTER" && value.seats === undefined) {
      ctx.addIssue({
        code: "custom",
        path: ["seats"],
        message: "Anzahl Plätze erforderlich.",
      });
    }
  });

/**
 * Fenêtre pendant laquelle une tentative INABOUTIE est réutilisée plutôt que
 * dupliquée. C'est ce qui rend notre `merchant_invoice_id` stable au travers
 * d'un retry réseau : si l'appel à CamerPay a échoué (timeout, 5xx), le
 * Payment est resté PENDING et sans `providerTxId` — CamerPay n'a donc jamais
 * pris connaissance de cette facture, et la rejouer sous le MÊME identifiant
 * est à la fois sûr et souhaitable. Dès que CamerPay a répondu (providerTxId
 * renseigné), une nouvelle demande ouvre une nouvelle facture.
 */
const RETRY_WINDOW_MS = 10 * 60_000;

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
  const { plan } = parsed.data;

  // Pas d'achat Student pendant un Premium actif (lib/plan-purchase.ts).
  const blocked = await blockStudentDuringPremium(user.id, plan);
  if (blocked) return blocked;

  // ── Montant : décidé ICI, jamais lu depuis la requête ──────────────────
  let amount: number;
  let seats: number | null = null;
  let centerMode: string | null = null;
  let periodDays: number | null = null;
  if (plan === "CENTER") {
    seats = parsed.data.seats ?? 0;
    // Devis sur l'état RÉEL des sièges (nouveau / renouvellement / ajout au
    // prorata) : lib/center-pricing.ts.
    const quote = await prepareCenterPurchase({
      userId: user.id,
      seats,
      requested: parsed.data.mode,
      currency: "XAF",
    });
    if (!quote.ok) {
      return NextResponse.json(modeRequiredBody(quote), { status: 409 });
    }
    amount = Math.round(quote.quote.amount);
    centerMode = quote.quote.mode;
    periodDays = quote.quote.mode === "ADD" ? quote.quote.billedDays : null;
  } else {
    const price = getPlanPrice(plan);
    if (!price) {
      return NextResponse.json({ error: "Ungültiger Plan." }, { status: 400 });
    }
    amount = Math.round(price.xaf);
  }
  if (amount <= 0) {
    return NextResponse.json({ error: "Ungültiger Betrag." }, { status: 400 });
  }

  // ── Numéro du payeur : proposé par le client, VALIDÉ par le serveur ────
  // La valeur envoyée à CamerPay est celle qui sort de la normalisation, pas
  // la chaîne brute du navigateur.
  const account = await db.user.findUnique({
    where: { id: user.id },
    select: { phone: true, name: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const customerPhone = normalizeCameroonMsisdn(parsed.data.phone ?? account.phone);
  if (!customerPhone) {
    return NextResponse.json(
      { error: "Ungültige Telefonnummer (Kamerun, 9 Ziffern)." },
      { status: 400 },
    );
  }

  const origin = new URL(request.url).origin;
  const returnUrl =
    plan === "CENTER"
      ? `${origin}/center?payment=pending`
      : `${origin}/dashboard?payment=pending`;

  try {
    // Réutilise une tentative inaboutie (cf. RETRY_WINDOW_MS) — sinon
    // nouvelle facture. `providerRef` EST le merchant_invoice_id.
    const reusable = await db.payment.findFirst({
      where: {
        userId: user.id,
        provider: "CAMERPAY",
        status: "PENDING",
        providerTxId: null,
        plan,
        amount,
        currency: "XAF",
        seats,
        centerMode,
        periodDays,
        createdAt: { gt: new Date(Date.now() - RETRY_WINDOW_MS) },
      },
      orderBy: { createdAt: "desc" },
      select: { providerRef: true },
    });

    const invoiceId = reusable?.providerRef ?? `cmp_${randomUUID()}`;
    if (!reusable) {
      await db.payment.create({
        data: {
          userId: user.id,
          provider: "CAMERPAY",
          providerRef: invoiceId,
          plan,
          seats,
          centerMode,
          periodDays,
          amount,
          currency: "XAF",
          status: "PENDING",
        },
      });
    }

    const result = await initiateCamerPayPayment({
      invoiceId,
      amount,
      customerPhone,
      paymentMethod: CAMERPAY_PAYMENT_METHOD,
      // SEULE source d'activation.
      callbackUrl: `${origin}/api/payments/camerpay/webhook`,
      // Retour navigateur : purement informatif, n'active jamais rien.
      returnUrl,
    });

    // Mémorise le transaction_uuid pour la relecture serveur au webhook. Une
    // collision sur l'index unique ne doit pas faire échouer un paiement déjà
    // ouvert : le webhook sait de toute façon retrouver la facture par son
    // merchant_invoice_id.
    if (result.uuid) {
      await db.payment
        .update({
          where: { providerRef: invoiceId },
          data: { providerTxId: result.uuid },
        })
        .catch((cause: unknown) => {
          console.error("[payments/camerpay] providerTxId non enregistré", cause);
        });
    }

    if (!result.payUrl) {
      // CamerPay a accepté la demande mais ne nous donne pas de page de
      // règlement : impossible d'envoyer l'utilisateur payer.
      console.error("[payments/camerpay] réponse sans pay_url");
      return NextResponse.json(
        { error: "Zahlung derzeit nicht möglich." },
        { status: 502 },
      );
    }

    return NextResponse.json({ url: result.payUrl });
  } catch (cause) {
    // Timeout, 5xx, corps illisible… La trace reste PENDING et pourra être
    // rejouée sous le même merchant_invoice_id. Aucun détail prestataire
    // n'est renvoyé au navigateur.
    console.error("[payments/camerpay] init", cause);
    return NextResponse.json(
      { error: "Zahlung derzeit nicht möglich." },
      { status: 502 },
    );
  }
}
