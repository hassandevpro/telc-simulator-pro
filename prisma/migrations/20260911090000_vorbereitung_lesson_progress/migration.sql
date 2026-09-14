-- Progression de la Vorbereitung (espace d'apprentissage public).
--
-- Migration strictement ADDITIVE : une seule nouvelle table, aucune
-- modification des tables existantes. Le CONTENU des leçons reste statique
-- (src/content/vorbereitung) — d'où l'absence de clé étrangère sur
-- "lessonSlug" : le catalogue n'existe pas en base.
--
-- Rédigée à la main (le serveur de base n'était pas joignable au moment de
-- la génération) mais identique à ce que produirait `prisma migrate dev`.

-- CreateTable
CREATE TABLE "LessonProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "lessonSlug" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "score" INTEGER,
    "maxScore" INTEGER,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LessonProgress_userId_idx" ON "LessonProgress"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_userId_lessonSlug_key" ON "LessonProgress"("userId", "lessonSlug");

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
