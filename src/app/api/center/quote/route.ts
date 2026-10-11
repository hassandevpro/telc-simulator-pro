import { NextResponse } from "next/server";
import { z } from "zod";
import { CENTER_SEAT_PRICE } from "@/config/pricing";
import { auth } from "@/lib/auth";
import { prepareCenterPurchase, quoteErrorResponse } from "@/lib/center-purchase";
import { quoteCenterPurchase } from "@/lib/center-pricing";

const querySchema = z.object({
  seats: z.coerce.number().int().min(CENTER_SEAT_PRICE.minSeats).max(CENTER_SEAT_PRICE.maxSeats),
  mode: z.enum(["renew", "add"]).optional(),
});

/**
 * Devis d'un achat de sièges, pour AFFICHER le prix avant de payer. Même
 * calcul que les routes de paiement (lib/center-pricing.ts) : ce que
 * l'écran annonce est ce que le serveur facturera. Sans compte connecté,
 * on renvoie le devis d'un premier achat (aucun siège actif).
 *
 * `needsMode` = le centre a des sièges actifs : l'écran doit proposer
 * « renouveler » / « ajouter » avant de pouvoir payer.
 */
export async function GET(request: Request) {
  const params = Object.fromEntries(new URL(request.url).searchParams);
  const parsed = querySchema.safeParse(params);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ungültige Angaben." }, { status: 400 });
  }
  const { seats, mode } = parsed.data;

  const session = await auth();
  const userId = session?.user?.id;

  const quoteFor = async (currency: "EUR" | "XAF") =>
    userId
      ? prepareCenterPurchase({ userId, seats, requested: mode, currency })
      : quoteCenterPurchase({
          state: { activeEnd: null, lastEnd: null },
          seats,
          currency,
        });

  const [eur, xaf] = await Promise.all([quoteFor("EUR"), quoteFor("XAF")]);
  if (!eur.ok || !xaf.ok) {
    const needs = !eur.ok ? eur : (xaf as Extract<typeof xaf, { ok: false }>);
    if (needs.code === "CENTER_OPEN_ENDED") {
      // Droits historiques sans échéance : rien à acheter en ligne.
      return NextResponse.json({
        needsMode: false,
        blocked: true,
        message: quoteErrorResponse(needs).body.error,
      });
    }
    return NextResponse.json({
      needsMode: true,
      activeEnd: needs.activeEnd.getTime(),
      lastEnd: needs.lastEnd.getTime(),
    });
  }
  return NextResponse.json({
    needsMode: false,
    mode: xaf.quote.mode,
    seats,
    amountXaf: xaf.quote.amount,
    amountEur: eur.quote.amount,
    startsAt: xaf.quote.startsAt.getTime(),
    expiresAt: xaf.quote.expiresAt.getTime(),
    billedDays: xaf.quote.billedDays,
    credits: xaf.quote.credits,
    // Crédits versés au DÉBUT de la période : maintenant, ou à sa date de début.
    creditsAt: xaf.quote.startsAt.getTime(),
    creditsDeferred: xaf.quote.startsAt.getTime() > Date.now() + 60_000,
  });
}
