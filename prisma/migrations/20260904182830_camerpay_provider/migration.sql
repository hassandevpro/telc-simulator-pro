-- Ajoute CamerPay comme troisième prestataire de paiement.
--
-- Migration strictement ADDITIVE : aucune donnée existante n'est lue,
-- réécrite ni supprimée, et les paiements Stripe/Flutterwave déjà en base
-- restent valides (providerTxId est nullable).
--
-- Note PostgreSQL : ALTER TYPE ... ADD VALUE est autorisé dans une
-- transaction depuis PG 12, à condition que la nouvelle valeur ne soit pas
-- utilisée dans cette même transaction — ce qui est le cas ici.

-- AlterEnum
ALTER TYPE "PaymentProvider" ADD VALUE 'CAMERPAY';

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "providerTxId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerTxId_key" ON "Payment"("providerTxId");
