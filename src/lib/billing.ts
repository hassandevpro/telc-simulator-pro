import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanPrice } from "@/config/pricing";

/**
 * Activation de plan et lecture du plan effectif.
 * L'activation est IDEMPOTENTE (rejouable sans risque : un webhook peut
 * arriver plusieurs fois) — repérée par le statut SUCCESS du paiement.
 */

const DAY_MS = 86_400_000;

/**
 * Crédite le plan acheté à l'utilisateur à partir d'un paiement (repéré par
 * sa référence prestataire). Renvoie true si le paiement existe (déjà traité
 * ou nouvellement activé). Prolonge un abonnement encore valide plutôt que
 * de le raccourcir.
 */
export async function activatePlanByRef(providerRef: string): Promise<boolean> {
  const payment = await db.payment.findUnique({ where: { providerRef } });
  if (!payment) return false;
  if (payment.status === "SUCCESS") return true; // déjà activé — no-op

  const days = getPlanPrice(payment.plan)?.durationDays ?? 30;
  const user = await db.user.findUnique({
    where: { id: payment.userId },
    select: { planExpiresAt: true },
  });
  const base =
    user?.planExpiresAt && user.planExpiresAt.getTime() > Date.now()
      ? user.planExpiresAt.getTime()
      : Date.now();
  const planExpiresAt = new Date(base + days * DAY_MS);

  await db.$transaction([
    db.payment.update({ where: { id: payment.id }, data: { status: "SUCCESS" } }),
    db.user.update({
      where: { id: payment.userId },
      data: { plan: payment.plan, planExpiresAt },
    }),
  ]);

  // Achat CENTER par quota : crédite les sièges au centre de l'acheteur.
  if (payment.plan === "CENTER" && payment.seats != null) {
    await db.center
      .updateMany({
        where: { ownerId: payment.userId },
        data: { seats: payment.seats },
      })
      .catch(() => undefined);
  }
  return true;
}

/**
 * Plan EFFECTIF de l'utilisateur connecté, lu en base (reflète un achat
 * immédiatement, sans reconnexion) et rétrogradé à FREE si l'abonnement a
 * expiré. À utiliser pour tout gating d'accès plutôt que le plan du JWT.
 */
export async function getCurrentUserPlan(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return "FREE";
  const user = await db.user.findUnique({
    where: { id },
    select: { plan: true, planExpiresAt: true, centerId: true },
  });
  if (!user) return "FREE";

  let plan = user.plan as string;
  if (
    plan !== "FREE" &&
    user.planExpiresAt &&
    user.planExpiresAt.getTime() < Date.now()
  ) {
    plan = "FREE";
  }

  // Étudiant membre d'un centre : accès au catalogue complet via le centre,
  // même sans abonnement individuel.
  if (plan === "FREE" && user.centerId) return "STUDENT";
  return plan;
}
