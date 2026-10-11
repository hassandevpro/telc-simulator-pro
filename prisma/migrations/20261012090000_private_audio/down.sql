-- RETOUR ARRIÈRE de 20261012090000_private_audio (non exécuté par Prisma :
-- à lancer à la main avec psql, APRÈS avoir remis l'ancien code et rendu le
-- bucket "audio" de nouveau public si l'ancien code doit fonctionner).
--
--   psql "$DATABASE_URL" -v supabase_url='https://xxxx.supabase.co' -f down.sql
--
-- 1. Les audios rattachés APRÈS la migration n'ont qu'un audioPath : on leur
--    reconstruit l'URL publique d'origine pour l'ancien code.
-- 2. Les deux colonnes ajoutées sont supprimées. Aucun fichier du bucket n'est
--    touché, aucune URL existante n'est modifiée.
BEGIN;
UPDATE "ExamPart"
SET "audioUrl" = :'supabase_url' || '/storage/v1/object/public/audio/' || "audioPath"
WHERE "audioUrl" IS NULL AND "audioPath" IS NOT NULL;
ALTER TABLE "ExamPart" DROP COLUMN "audioPath";
ALTER TABLE "ExamSession" DROP COLUMN "audioIssued";
-- Prisma : retirer la ligne correspondante de _prisma_migrations
-- (DELETE FROM "_prisma_migrations" WHERE migration_name = '20261012090000_private_audio';)
COMMIT;
