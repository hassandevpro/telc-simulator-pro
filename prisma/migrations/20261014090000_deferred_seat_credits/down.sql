-- RETOUR ARRIÈRE de 20261014090000_deferred_seat_credits (à lancer à la main
-- avec psql, après avoir remis l'ancien code).
-- ATTENTION : des crédits de renouvellements payés d'avance, pas encore versés
-- (creditedAt NULL), seraient PERDUS en supprimant les colonnes. On les verse
-- d'abord au propriétaire du centre, puis on supprime les colonnes.
BEGIN;
UPDATE "User" u
SET credits = u.credits + due.total
FROM (
  SELECT c."ownerId" AS owner_id, SUM(g."credits") AS total
  FROM "CenterSeatGrant" g JOIN "Center" c ON c.id = g."centerId"
  WHERE g."creditedAt" IS NULL AND g."credits" > 0
  GROUP BY c."ownerId"
) due
WHERE u.id = due.owner_id;
ALTER TABLE "CenterSeatGrant" DROP COLUMN "creditedAt";
ALTER TABLE "CenterSeatGrant" DROP COLUMN "credits";
-- DELETE FROM "_prisma_migrations" WHERE migration_name = '20261014090000_deferred_seat_credits';
COMMIT;
