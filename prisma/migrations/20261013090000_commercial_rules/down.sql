-- RETOUR ARRIÈRE de 20261013090000_commercial_rules (à lancer à la main avec
-- psql, après avoir remis l'ancien code). ATTENTION : supprime le journal des
-- remboursements manuels (CreditAdjustment) ; les crédits déjà recrédités
-- restent sur les comptes. Exporter la table avant si une trace est requise :
--   \copy "CreditAdjustment" TO 'credit_adjustments.csv' CSV HEADER
BEGIN;
DROP TABLE "CreditAdjustment";
ALTER TABLE "ExamSession" DROP COLUMN "creditAccountId";
ALTER TABLE "Payment" DROP COLUMN "periodDays";
ALTER TABLE "Payment" DROP COLUMN "centerMode";
-- DELETE FROM "_prisma_migrations" WHERE migration_name = '20261013090000_commercial_rules';
COMMIT;
