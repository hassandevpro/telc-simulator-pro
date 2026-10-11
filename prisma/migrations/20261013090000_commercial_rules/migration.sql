-- Règles commerciales : sièges Centre par période, compte débité, journal des
-- remboursements. Migration ADDITIVE : aucune ligne existante n'est modifiée.
-- Les paiements en attente (centerMode NULL) gardent l'ancien traitement.

ALTER TABLE "Payment" ADD COLUMN "centerMode" TEXT;
ALTER TABLE "Payment" ADD COLUMN "periodDays" INTEGER;

ALTER TABLE "ExamSession" ADD COLUMN "creditAccountId" TEXT;

CREATE TABLE "CreditAdjustment" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "adminId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CreditAdjustment_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CreditAdjustment_sessionId_key" ON "CreditAdjustment"("sessionId");
CREATE INDEX "CreditAdjustment_accountId_idx" ON "CreditAdjustment"("accountId");
