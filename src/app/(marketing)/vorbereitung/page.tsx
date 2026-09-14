import type { Metadata } from "next";
import Link from "next/link";
import { Card } from "@/components/ui";
import {
  LessonCatalog,
  type LessonCard,
} from "@/components/vorbereitung/LessonCatalog";
import { LESSONS, TRACKS } from "@/content/vorbereitung";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import type { ProgressMap } from "@/hooks/useVorbereitungProgress";

export const metadata: Metadata = {
  title: "Vorbereitung — telc B1/B2 lernen",
  description:
    "Kostenlose Vorbereitung auf die telc-Prüfung: Prüfungsteile erklärt, " +
    "Grammatik von B1 bis B2, Redemittel und Wortschatz — mit Übungen und " +
    "sofortiger Korrektur.",
};

/**
 * Catalogue de la Vorbereitung — page PUBLIQUE (aucune authentification).
 * Si un candidat est connecté, sa progression est lue en base et passée au
 * client comme état initial ; sinon le client part du LocalStorage.
 */
export default async function VorbereitungPage() {
  const session = await auth();
  const userId = session?.user?.id;

  let initialProgress: ProgressMap = {};
  if (userId) {
    const rows = await db.lessonProgress.findMany({
      where: { userId },
      select: {
        lessonSlug: true,
        completed: true,
        score: true,
        maxScore: true,
      },
    });
    initialProgress = Object.fromEntries(
      rows.map((row) => [
        row.lessonSlug,
        { completed: row.completed, score: row.score, maxScore: row.maxScore },
      ]),
    );
  }

  // Vue allégée : le contenu des leçons ne traverse jamais le réseau ici.
  const cards: LessonCard[] = LESSONS.map((lesson) => ({
    slug: lesson.slug,
    track: lesson.track,
    title: lesson.title,
    subtitle: lesson.subtitle,
    levels: lesson.levels,
    minutes: lesson.minutes,
    exerciseCount: lesson.exercises.length,
  }));

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-[22px] font-semibold tracking-tight">
          Vorbereitung
        </h1>
        <p className="max-w-2xl text-[14px] leading-relaxed text-muted">
          Alles, was vor dem ersten Modelltest hilft: das Format jedes
          Prüfungsteils, die Grammatik von B1 bis B2 und fertige Redemittel für
          den schriftlichen Ausdruck. Frei zugänglich, ohne Konto.
        </p>
      </header>

      <LessonCatalog
        lessons={cards}
        tracks={TRACKS}
        authenticated={!!userId}
        initialProgress={initialProgress}
      />

      <Card muted className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[14px] font-medium">Bereit für den Ernstfall?</p>
          <p className="text-[13px] text-muted">
            Die Theorie sitzt — jetzt unter Prüfungsbedingungen mit Timer und
            Auswertung üben.
          </p>
        </div>
        <Link
          href="/dashboard"
          className="rounded-sm border border-accent bg-accent px-4 py-1.5 text-[13px] font-medium text-white transition-colors duration-100 hover:bg-[#1e40af]"
        >
          Zum Modelltest
        </Link>
      </Card>
    </div>
  );
}
