import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanPrice } from "@/config/pricing";
import { createFlutterwavePayment } from "@/lib/payments/flutterwave";

const schema = z.object({ plan: z.enum(["STUDENT", "PREMIUM"]) });

/**
 * Ouvre un paiement Flutterwave (Mobile Money Afrique / cartes) en francs
 * CFA et renvoie le lien de règlement. Le plan est activé au webhook après
 * vérification serveur de la transaction.
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
  const txRef = `flw_${randomUUID()}`;

  try {
    await db.payment.create({
      data: {
        userId: user.id,
        provider: "FLUTTERWAVE",
        providerRef: txRef,
        plan: price.plan,
        amount: price.xaf,
        currency: "XAF",
        status: "PENDING",
      },
    });

    const link = await createFlutterwavePayment({
      txRef,
      amount: price.xaf,
      currency: "XAF",
      redirectUrl: `${origin}/dashboard?payment=success`,
      email: user.email,
      name: user.name ?? user.email,
      meta: { userId: user.id, plan: price.plan },
    });

    return NextResponse.json({ url: link });
  } catch (cause) {
    console.error("[payments/flutterwave] init", cause);
    return NextResponse.json(
      { error: "Zahlung derzeit nicht möglich." },
      { status: 500 },
    );
  }
}
