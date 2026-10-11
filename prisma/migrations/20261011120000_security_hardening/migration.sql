-- Durcissement sécurité (crédits, sièges datés, vérification e-mail fiable).
-- Migration ADDITIVE : aucune colonne existante n'est modifiée ni supprimée,
-- aucune ligne existante n'est effacée.

-- 1. Sessions : sort du crédit de passage (null = session historique).
ALTER TABLE "ExamSession" ADD COLUMN "creditStatus" TEXT;

-- 2. Utilisateurs : preuve de vérification d'e-mail + date d'adhésion centre.
ALTER TABLE "User" ADD COLUMN "emailVerifiedBy" TEXT;
ALTER TABLE "User" ADD COLUMN "centerJoinedAt" TIMESTAMP(3);

-- Comptes Google (sans mot de passe local, e-mail déjà vérifié par Google).
-- Les comptes à mot de passe restent à null : leur `emailVerified` a pu être
-- posé d'office à l'inscription et ne prouve rien.
UPDATE "User" SET "emailVerifiedBy" = 'GOOGLE'
WHERE "passwordHash" IS NULL AND "emailVerified" IS NOT NULL;

-- Membres existants : la date de création du compte sert d'ordre d'adhésion.
UPDATE "User" SET "centerJoinedAt" = "createdAt" WHERE "centerId" IS NOT NULL;

-- 3. Sièges datés.
CREATE TABLE "CenterSeatGrant" (
    "id" TEXT NOT NULL,
    "centerId" TEXT NOT NULL,
    "seats" INTEGER NOT NULL,
    "startsAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "paymentRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CenterSeatGrant_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "CenterSeatGrant_paymentRef_key" ON "CenterSeatGrant"("paymentRef");
CREATE INDEX "CenterSeatGrant_centerId_expiresAt_idx" ON "CenterSeatGrant"("centerId", "expiresAt");
ALTER TABLE "CenterSeatGrant" ADD CONSTRAINT "CenterSeatGrant_centerId_fkey"
    FOREIGN KEY ("centerId") REFERENCES "Center"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Reprise : le quota cumulé d'un centre devient UNE dotation valable jusqu'à
-- la fin de l'abonnement actuel du propriétaire (règle d'accès antérieure).
-- Un propriétaire sans date de fin conserve ses sièges 30 jours, le temps
-- d'un renouvellement.
INSERT INTO "CenterSeatGrant" ("id", "centerId", "seats", "startsAt", "expiresAt")
SELECT 'legacy_' || c."id", c."id", c."seats", c."createdAt",
       COALESCE(u."planExpiresAt", CURRENT_TIMESTAMP + INTERVAL '30 days')
FROM "Center" c JOIN "User" u ON u."id" = c."ownerId"
WHERE c."seats" > 0;
