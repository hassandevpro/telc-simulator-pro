/**
 * Tarifs facturables en ligne. Deux devises par plan :
 *  - EUR : cartes internationales via Stripe (le monde entier).
 *  - XAF : Mobile Money d'Afrique centrale (Cameroun MTN/Orange…) via
 *    Flutterwave. Le franc CFA est indexé sur l'euro (1 € ≈ 655,957 XAF) ;
 *    les montants sont arrondis à un palier lisible.
 *
 * L'achat crédite 30 jours d'accès (paiement ponctuel, pas de prélèvement
 * automatique) — le plan est prolongé à chaque paiement réussi.
 * Le plan CENTER reste sur devis (contact), non vendu en self-service.
 */

export type PayablePlan = "STUDENT" | "PREMIUM";

export interface PlanPrice {
  plan: PayablePlan;
  label: string;
  /** Montant en euros (Stripe, cartes). */
  eur: number;
  /** Montant en francs CFA (Flutterwave, Mobile Money). */
  xaf: number;
  /** Durée d'accès créditée par paiement, en jours. */
  durationDays: number;
}

export const PLAN_PRICES: Record<PayablePlan, PlanPrice> = {
  STUDENT: { plan: "STUDENT", label: "Student", eur: 9.9, xaf: 6500, durationDays: 30 },
  PREMIUM: { plan: "PREMIUM", label: "Premium", eur: 19.9, xaf: 13000, durationDays: 30 },
};

export function getPlanPrice(plan: string): PlanPrice | null {
  return plan in PLAN_PRICES ? PLAN_PRICES[plan as PayablePlan] : null;
}

/**
 * Plan CENTER : facturé au QUOTA d'étudiants (par siège / mois). Le centre
 * achète N sièges → N étudiants peuvent rejoindre via le lien d'invitation.
 */
export const CENTER_SEAT_PRICE = {
  eur: 4,
  xaf: 2500,
  durationDays: 30,
  minSeats: 1,
  maxSeats: 500,
};

export function centerAmount(seats: number, currency: "EUR" | "XAF"): number {
  const unit = currency === "EUR" ? CENTER_SEAT_PRICE.eur : CENTER_SEAT_PRICE.xaf;
  return Math.round(seats * unit * 100) / 100;
}
