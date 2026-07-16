import "server-only";
import { randomBytes } from "node:crypto";
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

  // Achat CENTER par quota (self-service) : promeut l'acheteur en
  // CENTER_ADMIN, crée son centre s'il n'existe pas, et AJOUTE les sièges
  // achetés au quota existant (additif).
  if (payment.plan === "CENTER") {
    const addSeats = payment.seats ?? 0;
    const center = await db.center.findUnique({
      where: { ownerId: payment.userId },
    });
    if (center) {
      await db.center.update({
        where: { id: center.id },
        data: { seats: { increment: addSeats } },
      });
    } else {
      await db.center.create({
        data: {
          ownerId: payment.userId,
          name: "Mein Zentrum",
          inviteCode: randomBytes(9).toString("base64url"),
          seats: addSeats,
        },
      });
    }
    // Le rôle du JWT ne se rafraîchit qu'à la reconnexion ; l'accès à
    // /center est néanmoins possible via la propriété du centre (requireCenterAdmin).
    await db.user.update({
      where: { id: payment.userId },
      data: { role: "CENTER_ADMIN" },
    });
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
    select: {
      plan: true,
      planExpiresAt: true,
      centerId: true,
      center: { select: { owner: { select: { plan: true, planExpiresAt: true } } } },
    },
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
  // MAIS seulement tant que l'abonnement du centre (son propriétaire) est
  // actif — rétrogradation en cascade à l'expiration.
  if (plan === "FREE" && user.centerId && user.center?.owner) {
    const owner = user.center.owner;
    const active =
      owner.plan !== "FREE" &&
      (!owner.planExpiresAt || owner.planExpiresAt.getTime() > Date.now());
    if (active) return "STUDENT";
  }
  return plan;
}
