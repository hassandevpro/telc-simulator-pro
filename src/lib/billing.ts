import "server-only";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanPrice } from "@/config/pricing";
import { CENTER_CREDITS_PER_SEAT, creditsForPlan } from "@/config/credits";

/**
 * Activation de plan et lecture du plan effectif.
 *
 * L'activation est IDEMPOTENTE, et cette idempotence est STRUCTURELLE
 * (garantie par PostgreSQL), pas applicative : voir activatePlanByRef.
 */

const DAY_MS = 86_400_000;

/**
 * Crédite le plan acheté à l'utilisateur à partir d'un paiement (repéré par
 * sa référence prestataire). Renvoie true si le paiement existe (déjà traité
 * ou nouvellement activé). Prolonge un abonnement encore valide plutôt que
 * de le raccourcir.
 *
 * IDEMPOTENCE — pourquoi cette forme et pas un `if (status === SUCCESS)` :
 * un webhook peut être livré plusieurs fois, y compris SIMULTANÉMENT. Un
 * `findUnique` suivi d'un test applicatif est un read-then-write : deux
 * livraisons concurrentes lisent toutes les deux PENDING et créditent
 * toutes les deux. Ici la transition PENDING → SUCCESS est un UPDATE
 * CONDITIONNEL (`updateMany where status: PENDING`) exécuté par PostgreSQL
 * sous verrou de ligne, DANS la transaction qui accorde les droits :
 *
 *   - le premier arrivant voit `count === 1` : il « réserve » le paiement
 *     et accorde plan + crédits + sièges ;
 *   - le second bloque sur le verrou de ligne jusqu'au commit du premier,
 *     puis voit `count === 0` et ressort sans le moindre effet ;
 *   - si l'octroi échoue, la transaction est annulée et la réservation est
 *     relâchée avec elle : le paiement redevient PENDING et un rejeu
 *     ultérieur pourra l'activer (pas de paiement encaissé sans droits).
 *
 * Seul un paiement PENDING est activable : une référence inconnue renvoie
 * false, un paiement déjà SUCCESS (ou FAILED) est un no-op renvoyant true.
 */
export async function activatePlanByRef(providerRef: string): Promise<boolean> {
  return db.$transaction(
    async (tx) => {
      // Réservation atomique. C'EST le verrou d'idempotence.
      const claimed = await tx.payment.updateMany({
        where: { providerRef, status: "PENDING" },
        data: { status: "SUCCESS" },
      });

      const payment = await tx.payment.findUnique({ where: { providerRef } });
      if (!payment) return false; // référence inconnue
      if (claimed.count === 0) return true; // déjà traité — aucun effet

      const days = getPlanPrice(payment.plan)?.durationDays ?? 30;
      const user = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { planExpiresAt: true },
      });
      const base =
        user?.planExpiresAt && user.planExpiresAt.getTime() > Date.now()
          ? user.planExpiresAt.getTime()
          : Date.now();
      const planExpiresAt = new Date(base + days * DAY_MS);

      await tx.user.update({
        where: { id: payment.userId },
        data: {
          plan: payment.plan,
          planExpiresAt,
          // Dotation de crédits ajoutée au solde (0 pour CENTER, crédité au
          // siège ci-dessous). Consommés ensuite examen par examen.
          credits: { increment: creditsForPlan(payment.plan) },
        },
      });

      // Achat CENTER par quota (self-service) : promeut l'acheteur en
      // CENTER_ADMIN, crée son centre s'il n'existe pas, et AJOUTE les sièges
      // achetés au quota existant (additif).
      if (payment.plan === "CENTER") {
        const addSeats = payment.seats ?? 0;
        const center = await tx.center.findUnique({
          where: { ownerId: payment.userId },
        });
        if (center) {
          await tx.center.update({
            where: { id: center.id },
            data: { seats: { increment: addSeats } },
          });
        } else {
          await tx.center.create({
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
        // Le pool de crédits du centre = sièges achetés × barème (consommé par
        // le propriétaire ET ses étudiants membres).
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            role: "CENTER_ADMIN",
            credits: { increment: addSeats * CENTER_CREDITS_PER_SEAT },
          },
        });
      }
      return true;
    },
    // Un webhook doit aboutir même si la base est momentanément lente ;
    // 5 s (défaut) est court pour une transaction qui écrit 3 tables.
    { timeout: 15_000 },
  );
}

/**
 * Plan EFFECTIF d'un utilisateur DONNÉ, lu en base (reflète un achat
 * immédiatement, sans reconnexion) et rétrogradé à FREE si l'abonnement a
 * expiré. Variante par identifiant de getCurrentUserPlan : indispensable
 * aux gardes serveur (lib/exam-access.ts) qui ont déjà résolu l'utilisateur
 * et ne doivent pas relire la session d'authentification.
 */
export async function getEffectivePlanForUser(id: string): Promise<string> {
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

/**
 * Plan EFFECTIF de l'utilisateur CONNECTÉ. À utiliser pour tout gating
 * d'accès plutôt que le plan du JWT (qui ne se rafraîchit qu'à la
 * reconnexion et peut donc être périmé après un achat ou une expiration).
 */
export async function getCurrentUserPlan(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return "FREE";
  return getEffectivePlanForUser(id);
}
