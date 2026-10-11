import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Garde d'ACHAT : un plan Student ne s'achète pas pendant un abonnement
 * Premium encore valable. On ne rétrograde pas en cours de période : le
 * client est invité à renouveler Premium (ou à attendre son échéance).
 *
 * Contrôle fait à l'INITIATION du paiement, sur les trois prestataires. Il
 * n'est pas étanche à une course (deux onglets, ou un paiement Student ouvert
 * AVANT l'achat Premium et réglé après) : le webhook conserve donc, en
 * filet, la règle « jamais de rétrogradation » (lib/billing.ts) — le client
 * garde Premium et la valeur payée est convertie en jours Premium.
 */
export async function premiumActiveUntil(userId: string): Promise<Date | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });
  if (user?.plan === "PREMIUM" && user.planExpiresAt && user.planExpiresAt.getTime() > Date.now()) {
    return user.planExpiresAt;
  }
  return null;
}

/** Réponse 409 commune aux routes de paiement, ou null si l'achat est permis. */
export async function blockStudentDuringPremium(
  userId: string,
  plan: string,
): Promise<NextResponse | null> {
  if (plan !== "STUDENT") return null;
  const until = await premiumActiveUntil(userId);
  if (!until) return null;
  return NextResponse.json(
    {
      error: `Sie haben bereits Premium (gültig bis ${until.toLocaleDateString("de-DE")}). Student kann in dieser Zeit nicht gekauft werden — verlängern Sie stattdessen Premium oder warten Sie das Ablaufdatum ab.`,
      code: "PREMIUM_ACTIVE",
      premiumUntil: until.getTime(),
    },
    { status: 409 },
  );
}
