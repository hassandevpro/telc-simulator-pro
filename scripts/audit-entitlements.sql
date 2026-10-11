-- ════════════════════════════════════════════════════════════════════════════
-- AUDIT DES DROITS EXISTANTS — LECTURE SEULE
--
--   psql "$DATABASE_URL" -f scripts/audit-entitlements.sql
--
-- À lancer sur une COPIE de la base de production (ou sur la production en
-- lecture : la transaction est déclarée READ ONLY, PostgreSQL refuse toute
-- écriture, puis elle est annulée). Aucune donnée n'est modifiée.
--
-- Il repère les comptes dont les droits payés pourraient être mal interprétés
-- par la migration ou par les nouvelles règles, surtout ceux SANS date
-- d'expiration fiable. Chaque ligne porte une action :
--   KEEP    droit existant conservé tel quel par le code (rien à faire pour
--           ne pas le perdre ; régularisation éventuelle = décision humaine)
--   REVIEW  anomalie probable : à examiner à la main avant la bascule
--   INFO    situation connue, sans effet sur les droits
-- Les lignes de total (user_id vide) ouvrent chaque groupe.
-- ════════════════════════════════════════════════════════════════════════════
BEGIN READ ONLY;

WITH members AS (
  SELECT "centerId" AS center_id, count(*)::int AS n
  FROM "User" WHERE "centerId" IS NOT NULL GROUP BY 1
),
centers AS (
  SELECT c."id" AS center_id, c."seats" AS seats, COALESCE(m.n, 0) AS members,
         u."id" AS owner_id, u."email" AS owner_email, u."plan"::text AS owner_plan,
         u."planExpiresAt" AS owner_expires
  FROM "Center" c
  JOIN "User" u ON u."id" = c."ownerId"
  LEFT JOIN members m ON m.center_id = c."id"
),
cases AS (
  -- A1 : plan payant sans date de fin (attribué à la main avant les paiements en ligne ?)
  SELECT 'A1_PERSONAL_PLAN_NO_EXPIRY' AS case_code, 'KEEP' AS action,
         u."id" AS user_id, u."email" AS email, u."plan"::text AS plan,
         u."planExpiresAt" AS plan_expires_at, u."role"::text AS role, u."credits" AS credits,
         NULL::text AS center_id, NULL::int AS seats, NULL::int AS members,
         'Accès sans échéance, conservé tel quel. Achats en ligne refusés (OPEN_ENDED_PLAN) tant qu''une date n''est pas fixée.' AS detail
  FROM "User" u
  WHERE u."plan" <> 'FREE' AND u."planExpiresAt" IS NULL

  UNION ALL
  -- A2 : propriétaire de centre sans date de fin, avec accès actif
  SELECT 'A2_CENTER_OWNER_NO_EXPIRY', 'KEEP', owner_id, owner_email, owner_plan, owner_expires,
         NULL, NULL, center_id, seats, members,
         'Sièges repris SANS échéance (31/12/2099, affiché « unbefristet »), jamais 30 jours. À régulariser par un humain.'
  FROM centers
  WHERE owner_plan <> 'FREE' AND owner_expires IS NULL AND GREATEST(seats, members) > 0

  UNION ALL
  -- B1 : abonnement du propriétaire expiré
  SELECT 'B1_CENTER_OWNER_EXPIRED', 'INFO', owner_id, owner_email, owner_plan, owner_expires,
         NULL, NULL, center_id, seats, members,
         'Abonnement expiré : dotation reprise déjà expirée, membres sans accès (comme avant).'
  FROM centers
  WHERE owner_plan <> 'FREE' AND owner_expires IS NOT NULL AND owner_expires <= now()
    AND GREATEST(seats, members) > 0

  UNION ALL
  -- B2 : paiement réussi récent mais plan inactif (droits peut-être non accordés)
  SELECT 'B2_PAID_RECENTLY_NO_ACTIVE_PLAN', 'REVIEW', u."id", u."email", u."plan"::text, u."planExpiresAt",
         u."role"::text, u."credits", NULL, NULL, NULL,
         'Paiement SUCCESS de ' || p."plan"::text || ' le ' || to_char(p."createdAt", 'YYYY-MM-DD')
           || ' (' || p."provider"::text || ', réf ' || p."providerRef" || ') mais plan inactif.'
  FROM "Payment" p
  JOIN "User" u ON u."id" = p."userId"
  WHERE p."status" = 'SUCCESS' AND p."createdAt" > now() - interval '30 days'
    AND (u."plan" = 'FREE' OR (u."planExpiresAt" IS NOT NULL AND u."planExpiresAt" <= now()))

  UNION ALL
  -- C1 : plus de membres que de sièges (avec accès actif)
  SELECT 'C1_MEMBERS_BEYOND_QUOTA', 'KEEP', owner_id, owner_email, owner_plan, owner_expires,
         NULL, NULL, center_id, seats, members,
         'Plus de membres que de sièges : tous gardent l''accès (sièges repris = max(quota, membres)). Plus d''adhésion possible avant achat de sièges.'
  FROM centers
  WHERE owner_plan <> 'FREE' AND seats > 0 AND members > seats

  UNION ALL
  -- C2 : membres rattachés alors que le quota est 0
  SELECT 'C2_MEMBERS_WITHOUT_QUOTA', 'KEEP', owner_id, owner_email, owner_plan, owner_expires,
         NULL, NULL, center_id, seats, members,
         'Membres rattachés sans quota acheté : l''ancien code leur donnait l''accès, conservé (sièges repris = nombre de membres).'
  FROM centers
  WHERE owner_plan <> 'FREE' AND seats = 0 AND members > 0

  UNION ALL
  -- C3 : propriétaire en plan FREE (aucun accès avant, aucun créé)
  SELECT 'C3_CENTER_OWNER_FREE', 'INFO', owner_id, owner_email, owner_plan, owner_expires,
         NULL, NULL, center_id, seats, members,
         'Propriétaire en plan FREE : aucun accès avant la migration, aucun accès créé.'
  FROM centers
  WHERE owner_plan = 'FREE' AND (seats > 0 OR members > 0)

  UNION ALL
  -- C4 : plan CENTER sans centre
  SELECT 'C4_CENTER_PLAN_WITHOUT_CENTER', 'REVIEW', u."id", u."email", u."plan"::text, u."planExpiresAt",
         u."role"::text, u."credits", NULL, NULL, NULL,
         'Plan CENTER mais aucun centre : paiement de sièges non finalisé ?'
  FROM "User" u
  WHERE u."plan" = 'CENTER' AND NOT EXISTS (SELECT 1 FROM "Center" c WHERE c."ownerId" = u."id")

  UNION ALL
  -- D1 : échéance très lointaine (saisie manuelle suspecte)
  SELECT 'D1_FAR_FUTURE_EXPIRY', 'REVIEW', u."id", u."email", u."plan"::text, u."planExpiresAt",
         u."role"::text, u."credits", NULL, NULL, NULL,
         'Échéance à plus de 400 jours : date saisie à la main ? À confirmer.'
  FROM "User" u
  WHERE u."plan" <> 'FREE' AND u."planExpiresAt" > now() + interval '400 days'

  UNION ALL
  -- E1 : paiements en attente au moment de l'audit
  SELECT 'E1_PENDING_PAYMENTS', 'INFO', u."id", u."email", u."plan"::text, u."planExpiresAt",
         u."role"::text, u."credits", NULL, p."seats", NULL,
         'Paiement PENDING ' || p."provider"::text || ' ' || p."plan"::text || ' du ' || to_char(p."createdAt", 'YYYY-MM-DD HH24:MI')
           || ' : activé avec l''ancienne règle (30 jours dès confirmation) s''il aboutit après la bascule.'
  FROM "Payment" p
  JOIN "User" u ON u."id" = p."userId"
  WHERE p."status" = 'PENDING' AND p."createdAt" > now() - interval '3 days'
)
SELECT case_code, action, user_id, email, plan, plan_expires_at, role, credits, center_id, seats, members, detail
FROM (
  SELECT * FROM cases
  UNION ALL
  SELECT case_code, action, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL,
         count(*)::text || ' cas'
  FROM cases GROUP BY case_code, action
) all_rows
ORDER BY case_code, (user_id IS NOT NULL), email;

ROLLBACK;
