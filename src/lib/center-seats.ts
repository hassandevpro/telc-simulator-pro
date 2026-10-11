import "server-only";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Sièges de centre DATÉS.
 *
 * Avant : `Center.seats` était un compteur cumulatif, incrémenté à chaque
 * achat et jamais décrémenté — 100 sièges achetés une fois restaient actifs
 * pour toujours, même renouvelés au minimum. Désormais un siège n'existe que
 * pendant la période de la dotation (CenterSeatGrant) qui l'a créé.
 *
 * Quand les sièges actifs sont moins nombreux que les membres, ce sont les
 * membres les plus ANCIENS (centerJoinedAt, puis id) qui gardent l'accès :
 * l'ordre est stable et ne dépend pas de qui se connecte en premier.
 */

type Client = Prisma.TransactionClient;

/** Durée de validité d'un siège acheté. */
export const SEAT_PERIOD_DAYS = 30;

/** Nombre de sièges actifs d'un centre à l'instant `now`. */
export async function activeSeats(
  client: Client,
  centerId: string,
  now: Date = new Date(),
): Promise<number> {
  const aggregate = await client.centerSeatGrant.aggregate({
    where: { centerId, startsAt: { lte: now }, expiresAt: { gt: now } },
    _sum: { seats: true },
  });
  return aggregate._sum.seats ?? 0;
}

/** Fin de validité la plus lointaine des sièges actifs (null s'il n'y en a pas). */
export async function seatsValidUntil(
  client: Client,
  centerId: string,
  now: Date = new Date(),
): Promise<Date | null> {
  const aggregate = await client.centerSeatGrant.aggregate({
    where: { centerId, startsAt: { lte: now }, expiresAt: { gt: now } },
    _max: { expiresAt: true },
  });
  return aggregate._max.expiresAt ?? null;
}

export interface MemberRef {
  id: string;
  centerId: string | null;
  centerJoinedAt: Date | null;
}

/**
 * Le membre occupe-t-il un siège ACTIF de son centre ? Faux s'il n'est
 * membre d'aucun centre, si le centre n'a plus de siège actif, ou s'il est
 * au-delà du quota actif dans l'ordre d'adhésion.
 */
export async function memberHasActiveSeat(
  client: Client,
  member: MemberRef,
  now: Date = new Date(),
): Promise<boolean> {
  if (!member.centerId) return false;
  const seats = await activeSeats(client, member.centerId, now);
  if (seats <= 0) return false;

  // Sans date d'adhésion (cas impossible après migration), le membre passe
  // en dernier : on n'accorde jamais un siège par défaut.
  const joined = member.centerJoinedAt ?? now;
  const ahead = await client.user.count({
    where: {
      centerId: member.centerId,
      id: { not: member.id },
      OR: [
        { centerJoinedAt: { lt: joined } },
        { centerJoinedAt: joined, id: { lt: member.id } },
      ],
    },
  });
  return ahead < seats;
}

/**
 * Compte dont les crédits sont consommés par `userId` : le propriétaire du
 * centre si l'utilisateur y occupe un siège actif, sinon lui-même.
 */
export async function creditAccountFor(
  client: Client,
  userId: string,
  now: Date = new Date(),
): Promise<string> {
  const accountId = await resolveCreditAccount(client, userId, now);
  // Toute lecture ou débit de crédits passe ici : les crédits d'une période
  // qui vient de commencer sont versés avant d'être comptés.
  await settleDueSeatCredits(client, accountId);
  return accountId;
}

async function resolveCreditAccount(
  client: Client,
  userId: string,
  now: Date,
): Promise<string> {
  const user = await client.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      centerId: true,
      centerJoinedAt: true,
      center: { select: { ownerId: true } },
    },
  });
  if (!user?.center) return userId;
  return (await memberHasActiveSeat(client, user, now))
    ? user.center.ownerId
    : userId;
}

/** Solde de crédits UTILISABLE par `userId` (pool du centre ou le sien). */
export async function creditBalanceFor(
  client: Client,
  userId: string,
): Promise<number> {
  const accountId = await creditAccountFor(client, userId);
  const account = await client.user.findUnique({
    where: { id: accountId },
    select: { credits: true },
  });
  return account?.credits ?? 0;
}

/**
 * État des périodes de sièges d'un centre, pour la tarification
 * (lib/center-pricing.ts) : fin de la période en cours, et fin de la
 * dernière période déjà payée (y compris une période à venir).
 */
export async function seatPeriodState(
  client: Client,
  centerId: string,
  now: Date = new Date(),
): Promise<{ activeEnd: Date | null; lastEnd: Date | null }> {
  const [active, upcoming] = await Promise.all([
    client.centerSeatGrant.aggregate({
      where: { centerId, startsAt: { lte: now }, expiresAt: { gt: now } },
      _max: { expiresAt: true },
    }),
    client.centerSeatGrant.aggregate({
      where: { centerId, expiresAt: { gt: now } },
      _max: { expiresAt: true },
    }),
  ]);
  return { activeEnd: active._max.expiresAt, lastEnd: upcoming._max.expiresAt };
}

/**
 * Verse au propriétaire les crédits des dotations de sièges dont la période a
 * COMMENCÉ et qui n'ont pas encore été créditées (renouvellements payés
 * d'avance). Appelé à chaque lecture ou débit de crédits : il n'y a pas de
 * tâche planifiée, la date de début suffit à déclencher le versement.
 *
 * IDEMPOTENT ET SANS COURSE : une seule instruction SQL marque les dotations
 * comme créditées ET lit leurs crédits (UPDATE … RETURNING). Deux appels
 * simultanés : le second attend le verrou de ligne, ne retrouve plus la
 * condition `creditedAt IS NULL` et ajoute 0 — un versement n'a lieu qu'une
 * fois.
 */
export async function settleDueSeatCredits(
  client: Client,
  ownerId: string,
): Promise<void> {
  await client.$executeRaw`
    WITH due AS (
      UPDATE "CenterSeatGrant" g
      SET "creditedAt" = now()
      FROM "Center" c
      WHERE g."centerId" = c."id"
        AND c."ownerId" = ${ownerId}
        AND g."creditedAt" IS NULL
        AND g."startsAt" <= now()
      RETURNING g."credits"
    )
    UPDATE "User"
    SET "credits" = "credits" + (SELECT COALESCE(SUM("credits"), 0) FROM due)
    WHERE "id" = ${ownerId}
      AND EXISTS (SELECT 1 FROM due)
  `;
}

/** Crédits de renouvellements payés d'avance, pas encore versés (affichage). */
export async function pendingSeatCredits(
  client: Client,
  centerId: string,
): Promise<{ credits: number; nextAt: Date | null }> {
  const aggregate = await client.centerSeatGrant.aggregate({
    where: { centerId, creditedAt: null, credits: { gt: 0 } },
    _sum: { credits: true },
    _min: { startsAt: true },
  });
  return { credits: aggregate._sum.credits ?? 0, nextAt: aggregate._min.startsAt };
}
