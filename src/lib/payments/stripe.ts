import "server-only";
import Stripe from "stripe";

/**
 * Client Stripe (cartes internationales, monde entier). Env :
 * STRIPE_SECRET_KEY (API) et STRIPE_WEBHOOK_SECRET (signature webhook).
 */
export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY manquante.");
  return new Stripe(key);
}
