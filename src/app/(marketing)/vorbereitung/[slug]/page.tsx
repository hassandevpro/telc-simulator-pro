import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonBlocks } from "@/components/vorbereitung/LessonBlocks";
import { LessonInteractive } from "@/components/vorbereitung/LessonInteractive";
import {
  getLesson,
  getLessonNeighbours,
  getTrack,
  lessonMaxScore,
} from "@/content/vorbereitung";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function generateMetadata({
  params,
}: PageProps<"/vorbereitung/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) return { title: "Lektion nicht gefunden" };

  return {
    title: `${lesson.title} — Vorbereitung telc ${lesson.levels.join("/")}`,
    description: lesson.subtitle,
  };
}

/**
 * Une leçon. Page PUBLIQUE : le contenu est rendu côté serveur (donc
 * indexable et sans JavaScript), seuls les exercices et le marquage de
 * progression sont interactifs.
 */
export default async function LessonPage({
  params,
}: PageProps<"/vorbereitung/[slug]">) {
  const { slug } = await params;
  const lesson = getLesson(slug);
  if (!lesson) notFound();

  const track = getTrack(lesson.track);
  const { previous, next } = getLessonNeighbours(slug);

  // Progression déjà enregistrée (candidat connecté uniquement).
  const session = await auth();
  const userId = session?.user?.id;
  const row = userId
    ? await db.lessonProgress.findUnique({
        where: { userId_lessonSlug: { userId, lessonSlug: slug } },
        select: { completed: true, score: true, maxScore: true },
      })
    : null;

  return (
    <article className="space-y-8">
      <nav className="text-[12px] text-muted">
        <Link href="/vorbereitung" className="hover:text-foreground">
          Vorbereitung
        </Link>
        {track ? <span> / {track.label}</span> : null}
      </nav>

      <header className="space-y-2 border-b border-border pb-5">
        <h1 className="text-[22px] font-semibold tracking-tight">
          {lesson.title}
        </h1>
        <p className="text-[14px] text-muted">{lesson.subtitle}</p>
        <p className="flex flex-wrap gap-x-3 text-[12px] text-muted">
          <span>Niveau {lesson.levels.join(" · ")}</span>
          <span>{lesson.minutes} Min. Lesezeit</span>
          {lesson.exercises.length > 0 ? (
            <span>
              {lesson.exercises.length} Übungen · {lessonMaxScore(lesson)} Items
            </span>
          ) : null}
        </p>
      </header>

      {lesson.sections.map((section) => (
        <section key={section.id} className="space-y-3">
          <h2 className="text-[15px] font-semibold">{section.title}</h2>
          <LessonBlocks blocks={section.blocks} />
        </section>
      ))}

      <LessonInteractive
        slug={lesson.slug}
        exercises={lesson.exercises}
        authenticated={!!userId}
        initialEntry={
          row
            ? {
                completed: row.completed,
                score: row.score,
                maxScore: row.maxScore,
              }
            : undefined
        }
      />

      <nav className="flex items-center justify-between gap-3 border-t border-border pt-4 text-[13px]">
        {previous ? (
          <Link
            href={`/vorbereitung/${previous.slug}`}
            className="text-muted hover:text-foreground"
          >
            ← {previous.title}
          </Link>
        ) : (
          <span />
        )}
        {next ? (
          <Link
            href={`/vorbereitung/${next.slug}`}
            className="text-right text-muted hover:text-foreground"
          >
            {next.title} →
          </Link>
        ) : (
          <span />
        )}
      </nav>
    </article>
  );
}
