/**
 * Système de crédits — anti-partage de compte.
 * 1 crédit = 1 passage d'examen complet, débité au démarrage réel du chrono
 * (pose de startedAt). Un compte partagé épuise donc vite son solde.
 *
 * Barème (rechargé/ajouté à chaque paiement réussi ; FREE = dotation initiale).
 * Ces nombres sont une décision métier : ajuste-les ici, rien d'autre à toucher.
 */
export const PLAN_CREDITS = {
  FREE: 2,
  STUDENT: 15,
  PREMIUM: 50,
} as const;

/** Crédits ajoutés au pool du centre par siège acheté. */
export const CENTER_CREDITS_PER_SEAT = 15;

/**
 * Crédits accordés par un paiement d'un plan payant (ajoutés au solde).
 * Retourne 0 pour un plan sans dotation directe (ex. CENTER, crédité au siège).
 */
export function creditsForPlan(plan: string): number {
  if (plan === "STUDENT") return PLAN_CREDITS.STUDENT;
  if (plan === "PREMIUM") return PLAN_CREDITS.PREMIUM;
  return 0;
}
