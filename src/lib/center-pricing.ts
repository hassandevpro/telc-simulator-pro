import { CENTER_CREDITS_PER_SEAT } from "@/config/credits";
import { CENTER_SEAT_PRICE } from "@/config/pricing";

/**
 * Tarification des sièges de centre — logique PURE (aucune base, aucun
 * réseau) : le serveur l'applique à l'initiation d'un paiement pour décider
 * du montant, et à l'activation pour dater les sièges.
 *
 * Trois cas, déterminés par l'état des sièges du centre :
 *
 *  NEW    aucun siège actif → N sièges pour 30 jours à partir de maintenant,
 *         prix plein.
 *  RENEW  sièges actifs, le centre veut la période SUIVANTE → N sièges pour
 *         30 jours qui COMMENCENT À LA FIN de la dernière période déjà payée
 *         (aucun chevauchement, rien n'est payé deux fois), prix plein.
 *  ADD    sièges actifs, le centre veut des places SUPPLÉMENTAIRES → N sièges
 *         de maintenant jusqu'à la fin de la période en cours, au PRORATA des
 *         jours restants (tout jour entamé est dû, minimum 1 jour).
 *
 * Tant qu'une période est active, le choix RENEW / ADD doit être fait
 * explicitement par le client : le serveur ne devine jamais entre acheter
 * plus tard et acheter plus.
 */

export type CenterMode = "NEW" | "RENEW" | "ADD";
export type RequestedMode = "renew" | "add";
export type Currency = "EUR" | "XAF";

export const DAY_MS = 86_400_000;
const PERIOD_DAYS = CENTER_SEAT_PRICE.durationDays;

export interface SeatPeriodState {
  /** Fin de la période en cours (max des fins des dotations actives), sinon null. */
  activeEnd: Date | null;
  /** Fin de la dernière période déjà payée (y compris à venir), sinon null. */
  lastEnd: Date | null;
}

export interface CenterQuote {
  mode: CenterMode;
  seats: number;
  currency: Currency;
  /** Montant à payer : XAF entier, EUR à deux décimales. */
  amount: number;
  startsAt: Date;
  expiresAt: Date;
  /** Jours facturés (30 pour NEW/RENEW, jours restants pour ADD). */
  billedDays: number;
  /** Crédits ajoutés au pool du centre à l'activation. */
  credits: number;
}

export type QuoteResult =
  | { ok: true; quote: CenterQuote }
  | { ok: false; code: "CENTER_MODE_REQUIRED"; activeEnd: Date; lastEnd: Date }
  | { ok: false; code: "CENTER_OPEN_ENDED" };

/**
 * Année à partir de laquelle une échéance de sièges est « sans échéance »
 * (droits historiques attribués sans date de fin, repris par la migration
 * avec le 31/12/2099). Un prorata ou un renouvellement n'ont aucun sens sur
 * une telle période : l'achat est refusé et renvoyé au support.
 */
export const OPEN_ENDED_YEAR = 2099;
export const isOpenEnded = (date: Date | null | undefined): boolean =>
  Boolean(date) && date!.getUTCFullYear() >= OPEN_ENDED_YEAR;

function round(amount: number, currency: Currency): number {
  return currency === "XAF" ? Math.round(amount) : Math.round(amount * 100) / 100;
}

export function seatUnitPrice(currency: Currency): number {
  return currency === "EUR" ? CENTER_SEAT_PRICE.eur : CENTER_SEAT_PRICE.xaf;
}

/** Jours à facturer pour couvrir [now, end] : tout jour entamé est dû, 1 minimum. */
export function remainingBilledDays(now: Date, end: Date): number {
  return Math.max(1, Math.ceil((end.getTime() - now.getTime()) / DAY_MS));
}

export function quoteCenterPurchase(input: {
  state: SeatPeriodState;
  seats: number;
  requested?: RequestedMode;
  currency: Currency;
  now?: Date;
}): QuoteResult {
  const { state, seats, currency } = input;
  const now = input.now ?? new Date();
  const unit = seatUnitPrice(currency);
  const nowMs = now.getTime();

  const activeEnd = state.activeEnd && state.activeEnd.getTime() > nowMs ? state.activeEnd : null;
  const lastEnd =
    state.lastEnd && state.lastEnd.getTime() > nowMs ? state.lastEnd : null;

  // Droits historiques sans échéance : ni renouvellement ni prorata possibles.
  if (isOpenEnded(activeEnd) || isOpenEnded(lastEnd)) {
    return { ok: false, code: "CENTER_OPEN_ENDED" };
  }

  const base = (mode: CenterMode, startsAt: Date, billedDays: number, amount: number, credits: number): QuoteResult => ({
    ok: true,
    quote: {
      mode,
      seats,
      currency,
      amount: round(amount, currency),
      startsAt,
      expiresAt:
        mode === "ADD" ? activeEnd! : new Date(startsAt.getTime() + PERIOD_DAYS * DAY_MS),
      billedDays,
      credits,
    },
  });

  // Aucun siège actif : première période, ou reprise après une interruption.
  if (!activeEnd) {
    const startsAt = lastEnd && lastEnd.getTime() > nowMs ? lastEnd : now;
    return base("NEW", startsAt, PERIOD_DAYS, seats * unit, seats * CENTER_CREDITS_PER_SEAT);
  }

  if (!input.requested) {
    return { ok: false, code: "CENTER_MODE_REQUIRED", activeEnd, lastEnd: lastEnd ?? activeEnd };
  }

  if (input.requested === "renew") {
    return base("RENEW", lastEnd ?? activeEnd, PERIOD_DAYS, seats * unit, seats * CENTER_CREDITS_PER_SEAT);
  }

  const days = remainingBilledDays(now, activeEnd);
  return base(
    "ADD",
    now,
    days,
    (seats * unit * days) / PERIOD_DAYS,
    Math.round((seats * CENTER_CREDITS_PER_SEAT * days) / PERIOD_DAYS),
  );
}

/**
 * Dates réelles d'une dotation à l'ACTIVATION du paiement, recalculées sur
 * l'état d'alors (le paiement a pu arriver longtemps après l'initiation) :
 *  - NEW/RENEW : à la fin de la dernière période payée si elle existe encore,
 *    sinon maintenant — deux renouvellements successifs s'enchaînent ;
 *  - ADD : jusqu'à la fin de la période en cours ; si elle a expiré entre
 *    l'initiation et le paiement, autant de jours que ce qui a été facturé ;
 *  - mode inconnu (paiement antérieur à cette règle) : ancien traitement,
 *    30 jours à partir de maintenant.
 */
export function grantWindow(input: {
  mode: string | null;
  periodDays: number | null;
  state: SeatPeriodState;
  now?: Date;
}): { startsAt: Date; expiresAt: Date } {
  const now = input.now ?? new Date();
  const nowMs = now.getTime();
  const lastEnd = input.state.lastEnd && input.state.lastEnd.getTime() > nowMs ? input.state.lastEnd : null;
  const activeEnd = input.state.activeEnd && input.state.activeEnd.getTime() > nowMs ? input.state.activeEnd : null;

  if (input.mode === "ADD") {
    if (activeEnd) return { startsAt: now, expiresAt: activeEnd };
    const days = Math.max(1, input.periodDays ?? 1);
    return { startsAt: now, expiresAt: new Date(nowMs + days * DAY_MS) };
  }
  if (input.mode === "NEW" || input.mode === "RENEW") {
    const startsAt = lastEnd ?? now;
    return { startsAt, expiresAt: new Date(startsAt.getTime() + PERIOD_DAYS * DAY_MS) };
  }
  return { startsAt: now, expiresAt: new Date(nowMs + PERIOD_DAYS * DAY_MS) };
}

/** Crédits ajoutés au pool : plein pour NEW/RENEW/inconnu, au prorata pour ADD. */
export function creditsForGrant(mode: string | null, seats: number, periodDays: number | null): number {
  if (mode === "ADD") {
    return Math.round((seats * CENTER_CREDITS_PER_SEAT * Math.max(1, periodDays ?? 1)) / PERIOD_DAYS);
  }
  return seats * CENTER_CREDITS_PER_SEAT;
}
