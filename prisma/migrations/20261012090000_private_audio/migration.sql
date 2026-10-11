-- Audios privés : chemin de fichier dans le bucket + compteur d'émissions.
-- Migration ADDITIVE et RÉVERSIBLE : aucune colonne existante n'est modifiée,
-- aucune ligne n'est supprimée, aucun fichier n'est déplacé. "audioUrl" reste
-- intact (retour arrière : voir down.sql dans ce dossier).

ALTER TABLE "ExamPart" ADD COLUMN "audioPath" TEXT;
ALTER TABLE "ExamSession" ADD COLUMN "audioIssued" JSONB NOT NULL DEFAULT '{}';

-- Reprise : le chemin est extrait des URL publiques Supabase existantes
-- (…/storage/v1/object/public/audio/<chemin>). Seuls les noms "sûrs" (une
-- seule composante, caractères [A-Za-z0-9._-]) sont repris ; les autres
-- lignes gardent audioPath NULL et leur audioUrl d'origine (la liste est
-- affichée par la requête de contrôle de docs/SECURITY.md).
-- Les chemins statiques de la démo (/audio/demo/…) ne sont pas touchés.
UPDATE "ExamPart"
SET "audioPath" = substring("audioUrl" from '/storage/v1/object/(?:public|sign)/audio/([A-Za-z0-9][A-Za-z0-9._-]{0,200})(?:[?#].*)?$')
WHERE "audioUrl" IS NOT NULL
  AND "audioPath" IS NULL;
