import "server-only";
import { randomBytes } from "node:crypto";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getPlanPrice } from "@/config/pricing";
import { creditsForPlan } from "@/config/credits";
import { creditsForGrant, grantWindow } from "@/lib/center-pricing";
import { memberHasActiveSeat, seatPeriodState } from "@/lib/center-seats";
import type { Prisma } from "@/generated/prisma/client";

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

      const now = Date.now();
      const user = await tx.user.findUnique({
        where: { id: payment.userId },
        select: { plan: true, planExpiresAt: true, role: true },
      });
      const current = {
        plan: (user?.plan ?? "FREE") as string,
        expiresAt: user?.planExpiresAt?.getTime() ?? null,
      };
      // Plan payant SANS date de fin : droit historique « sans échéance »
      // (attribué à la main). Un achat ne doit jamais le remplacer par un plan
      // de 30 jours : plan et absence d'échéance sont conservés, seule la
      // valeur payée (crédits) est ajoutée.
      const openEnded = current.plan !== "FREE" && current.expiresAt === null;
      const currentActive =
        current.plan !== "FREE" && (current.expiresAt === null || current.expiresAt > now);

      if (payment.plan === "CENTER") {
        const granted = await grantCenterSeats(tx, payment, now);
        // Plan PERSONNEL du propriétaire : un Student/Premium encore actif est
        // conservé tel quel (les sièges ont leur propre validité). Sinon il
        // devient CENTER jusqu'à la fin de la dernière période de sièges payée.
        const keepPersonal = openEnded || (currentActive && current.plan !== "CENTER");
        const endOfSeats = granted.expiresAt?.getTime() ?? 0;
        await tx.user.update({
          where: { id: payment.userId },
          data: {
            ...(keepPersonal
              ? {}
              : {
                  plan: "CENTER" as const,
                  planExpiresAt: new Date(
                    Math.max(endOfSeats, currentActive ? current.expiresAt! : 0),
                  ),
                }),
            // Un SUPER_ADMIN qui achète des sièges reste SUPER_ADMIN.
            ...(user?.role === "SUPER_ADMIN" ? {} : { role: "CENTER_ADMIN" as const }),
            // Crédits versés maintenant seulement si la période a déjà commencé ;
            // un renouvellement payé d'avance est crédité à sa date de début
            // (settleDueSeatCredits, lib/center-seats.ts).
            credits: { increment: granted.creditsNow },
          },
        });
        return true;
      }

      if (openEnded) {
        await tx.user.update({
          where: { id: payment.userId },
          data: { credits: { increment: creditsForPlan(payment.plan) } },
        });
        return true;
      }

      const days = getPlanPrice(payment.plan)?.durationDays ?? 30;
      const base = currentActive ? current.expiresAt! : now;
      const currentRank = PLAN_RANK[current.plan] ?? 0;
      const boughtRank = PLAN_RANK[payment.plan] ?? 0;

      let plan = payment.plan;
      let addedDays = days;
      if (currentActive && currentRank > boughtRank) {
        // Achat INFÉRIEUR pendant un abonnement supérieur actif : le plan
        // supérieur est CONSERVÉ (jamais de rétrogradation), et la valeur
        // payée est convertie en jours du plan supérieur, au prorata des prix
        // (ex. 30 j Student = 15 j Premium). Aucun paiement n'est perdu.
        plan = current.plan as typeof payment.plan;
        addedDays = proratedDays(payment.plan, current.plan, days);
      }

      await tx.user.update({
        where: { id: payment.userId },
        data: {
          plan,
          planExpiresAt: new Date(base + addedDays * DAY_MS),
          // Dotation de crédits ajoutée au solde, consommée examen par examen.
          credits: { increment: creditsForPlan(payment.plan) },
        },
      });
      return true;
    },
    // Un webhook doit aboutir même si la base est momentanément lente ;
    // 5 s (défaut) est court pour une transaction qui écrit 3 tables.
    { timeout: 15_000 },
  );
}

/**
 * Rang des plans PERSONNELS pour la règle « pas de rétrogradation ».
 * CENTER (plan d'établissement) a le rang de Student : il ouvre le catalogue,
 * sans les avantages Premium.
 */
const PLAN_RANK: Record<string, number> = {
  FREE: 0,
  STUDENT: 1,
  CENTER: 1,
  PREMIUM: 2,
};

/** Jours du plan `into` équivalents à `days` jours du plan `bought` (prix XAF). */
function proratedDays(bought: string, into: string, days: number): number {
  const paid = getPlanPrice(bought)?.xaf;
  const target = getPlanPrice(into)?.xaf;
  if (!paid || !target) return days;
  return Math.max(1, Math.round((days * paid) / target));
}

/**
 * Achat de sièges : crée le centre s'il n'existe pas, puis une DOTATION
 * datée (CenterSeatGrant). Les dates dépendent du mode fixé à l'initiation
 * (lib/center-pricing.ts) : nouveau, renouvellement à la fin de la période
 * payée, ou ajout jusqu'à cette échéance. Aucun compteur cumulatif : des
 * sièges expirés ne survivent jamais à un renouvellement plus petit.
 * Renvoie la fin de la dotation créée.
 */
async function grantCenterSeats(
  tx: Prisma.TransactionClient,
  payment: {
    userId: string;
    seats: number | null;
    providerRef: string;
    centerMode: string | null;
    periodDays: number | null;
  },
  now: number,
): Promise<{ expiresAt: Date | null; creditsNow: number }> {
  const center =
    (await tx.center.findUnique({ where: { ownerId: payment.userId } })) ??
    (await tx.center.create({
      data: {
        ownerId: payment.userId,
        name: "Mein Zentrum",
        inviteCode: randomBytes(9).toString("base64url"),
      },
    }));
  const seats = payment.seats ?? 0;
  if (seats <= 0) return { expiresAt: null, creditsNow: 0 };

  // Verrou de ligne du centre : deux paiements simultanés s'enchaînent au
  // lieu de se chevaucher (le second voit la dotation du premier).
  await tx.$queryRaw`SELECT "id" FROM "Center" WHERE "id" = ${center.id} FOR UPDATE`;
  const window = grantWindow({
    mode: payment.centerMode,
    periodDays: payment.periodDays,
    state: await seatPeriodState(tx, center.id, new Date(now)),
    now: new Date(now),
  });
  // Crédits : au début de la période (règle validée). Période déjà commencée
  // (nouveau, ajout) = versés tout de suite ; renouvellement payé d'avance =
  // versés quand sa date de début arrive.
  const credits = creditsForGrant(payment.centerMode, seats, payment.periodDays);
  const startedAlready = window.startsAt.getTime() <= now;
  await tx.centerSeatGrant.create({
    data: {
      centerId: center.id,
      seats,
      startsAt: window.startsAt,
      expiresAt: window.expiresAt,
      paymentRef: payment.providerRef,
      credits,
      creditedAt: startedAlready ? new Date(now) : null,
    },
  });
  return { expiresAt: window.expiresAt, creditsNow: startedAlready ? credits : 0 };
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
      id: true,
      plan: true,
      planExpiresAt: true,
      centerId: true,
      centerJoinedAt: true,
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
  // MAIS seulement s'il occupe un siège ACTIF (dotation non expirée, dans
  // l'ordre d'adhésion) — un centre qui renouvelle moins de sièges ne garde
  // pas l'accès de tous ses anciens membres.
  if (plan === "FREE" && user.centerId) {
    if (await memberHasActiveSeat(db, user)) return "STUDENT";
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
