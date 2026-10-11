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

-- Reprise : les droits d'accès ACTUELS des centres deviennent UNE dotation.
-- Règle d'accès antérieure, reproduite à l'identique (billing.ts avant le
-- sprint) : un membre avait accès au catalogue tant que le PROPRIÉTAIRE du
-- centre avait un plan payant (plan <> 'FREE') non expiré — quel que soit le
-- quota `seats`, et quel que soit le nombre de membres.
--  - sièges repris = le plus grand de `seats` et du nombre de membres déjà
--    rattachés : aucun membre existant ne perd l'accès ;
--  - échéance = fin de l'abonnement du propriétaire. SANS date de fin, les
--    sièges n'avaient pas d'échéance : ils reçoivent le 31/12/2099 (affiché
--    « unbefristet »), jamais une durée plus courte. À régulariser par un
--    humain (docs/SECURITY.md, règle de migration) ; cette migration ne le fait pas ;
--  - propriétaire en plan FREE : l'ancien code ne donnait AUCUN accès, la
--    migration n'en crée donc aucun ;
--  - propriétaire à l'abonnement expiré : dotation déjà expirée (aucun accès,
--    comme avant).
INSERT INTO "CenterSeatGrant" ("id", "centerId", "seats", "startsAt", "expiresAt")
SELECT 'legacy_' || c."id", c."id", GREATEST(c."seats", m."n"), c."createdAt",
       COALESCE(u."planExpiresAt", TIMESTAMP '2099-12-31 00:00:00')
FROM "Center" c
JOIN "User" u ON u."id" = c."ownerId"
JOIN LATERAL (
  SELECT count(*)::int AS "n" FROM "User" x WHERE x."centerId" = c."id"
) m ON true
WHERE u."plan" <> 'FREE'
  AND GREATEST(c."seats", m."n") > 0;
