import "server-only";
import { seatPeriodState } from "@/lib/center-seats";
import {
  quoteCenterPurchase,
  type Currency,
  type QuoteResult,
  type RequestedMode,
} from "@/lib/center-pricing";
import { db } from "@/lib/db";

/**
 * Devis d'un achat de sièges pour le centre de `userId`, calculé sur l'état
 * RÉEL des sièges en base. Le montant, le mode et les dates viennent
 * toujours d'ici — jamais du navigateur, qui ne propose que `seats` et le
 * choix « renouveler » / « ajouter ».
 */
export async function prepareCenterPurchase(input: {
  userId: string;
  seats: number;
  requested?: RequestedMode;
  currency: Currency;
  now?: Date;
}): Promise<QuoteResult> {
  const center = await db.center.findUnique({
    where: { ownerId: input.userId },
    select: { id: true },
  });
  const state = center
    ? await seatPeriodState(db, center.id, input.now)
    : { activeEnd: null, lastEnd: null };
  return quoteCenterPurchase({
    state,
    seats: input.seats,
    requested: input.requested,
    currency: input.currency,
    now: input.now,
  });
}

/** Réponse HTTP d'un choix de mode manquant (409) — commune aux routes. */
export function modeRequiredBody(result: Extract<QuoteResult, { ok: false }>) {
  return {
    error:
      "Ihr Zentrum hat bereits aktive Plätze. Bitte wählen Sie: nächste Periode verlängern oder zusätzliche Plätze bis zum Periodenende (anteilig).",
    code: result.code,
    activeEnd: result.activeEnd.getTime(),
    lastEnd: result.lastEnd.getTime(),
  };
}
