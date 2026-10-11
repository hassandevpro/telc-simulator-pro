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
