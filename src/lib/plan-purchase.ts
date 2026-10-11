import "server-only";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";

/**
 * Gardes d'ACHAT d'un plan personnel (Student / Premium), à l'initiation du
 * paiement, sur les trois prestataires.
 *
 *  1. Plan SANS date d'expiration (attribué à la main avant les paiements en
 *     ligne) : accès sans échéance. Un achat en ligne ne doit jamais le
 *     remplacer par un plan de 30 jours — il est refusé et renvoyé au support,
 *     qui régularise (date explicite) sans rien faire perdre.
 *  2. Student pendant un Premium encore valable : refusé. On ne rétrograde pas
 *     en cours de période ; le client renouvelle Premium ou attend l'échéance.
 *
 * Ces contrôles ne sont pas étanches à une course (deux onglets, ou un
 * paiement ouvert AVANT l'attribution et réglé après) : le webhook garde, en
 * filet, la règle « jamais de perte de droits » (lib/billing.ts) — le plan et
 * l'absence d'échéance sont conservés, les crédits payés sont ajoutés.
 */

const SUPPORT_HINT =
  "Bitte wenden Sie sich an den Support (WhatsApp), damit Ihr Zugang ohne Verlust angepasst wird.";

export interface PlanState {
  plan: string;
  planExpiresAt: Date | null;
}

/** Plan payant sans date de fin : droit historique « sans échéance ». */
export const isOpenEndedPlan = (user: PlanState | null): boolean =>
  Boolean(user) && user!.plan !== "FREE" && user!.planExpiresAt === null;

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
export async function guardPlanPurchase(
  userId: string,
  plan: string,
): Promise<NextResponse | null> {
  // Les sièges de centre ont leur propre devis (lib/center-purchase.ts).
  if (plan !== "STUDENT" && plan !== "PREMIUM") return null;
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { plan: true, planExpiresAt: true },
  });

  if (isOpenEndedPlan(user)) {
    return NextResponse.json(
      {
        error: `Ihr Zugang (${user!.plan}) ist unbefristet. Ein Online-Kauf würde ihn durch einen befristeten Plan ersetzen. ${SUPPORT_HINT}`,
        code: "OPEN_ENDED_PLAN",
      },
      { status: 409 },
    );
  }

  if (
    plan === "STUDENT" &&
    user?.plan === "PREMIUM" &&
    user.planExpiresAt &&
    user.planExpiresAt.getTime() > Date.now()
  ) {
    const until = user.planExpiresAt;
    return NextResponse.json(
      {
        error: `Sie haben bereits Premium (gültig bis ${until.toLocaleDateString("de-DE")}). Student kann in dieser Zeit nicht gekauft werden — verlängern Sie stattdessen Premium oder warten Sie das Ablaufdatum ab.`,
        code: "PREMIUM_ACTIVE",
        premiumUntil: until.getTime(),
      },
      { status: 409 },
    );
  }
  return null;
}
