-- Crédits d'un renouvellement versés au DÉBUT de la nouvelle période.
-- Migration additive. Toutes les dotations existantes sont marquées comme
-- DÉJÀ créditées : leurs crédits ont été versés au paiement, sous l'ancienne
-- règle, et ne doivent jamais l'être une seconde fois.

ALTER TABLE "CenterSeatGrant" ADD COLUMN "credits" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "CenterSeatGrant" ADD COLUMN "creditedAt" TIMESTAMP(3);

UPDATE "CenterSeatGrant" SET "creditedAt" = "createdAt";
