"use client";

import { SeatPurchasePanel } from "@/components/center/SeatPurchasePanel";

/**
 * Achat du plan Centre en self-service (page tarifs). Le prix, la période et
 * le choix « renouveler » / « ajouter » sont gérés par SeatPurchasePanel, sur
 * un devis calculé par le serveur (lib/center-pricing.ts). Au succès, l'acheteur
 * devient CENTER_ADMIN (webhook).
 */
export function CenterPurchase() {
  return <SeatPurchasePanel />;
}
