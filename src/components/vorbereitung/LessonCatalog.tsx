"use client";

import Link from "next/link";
import { useState } from "react";
import { Card, ProgressBar } from "@/components/ui";
import type { TrackDefinition } from "@/content/vorbereitung";
import {
  useVorbereitungProgress,
  type ProgressMap,
} from "@/hooks/useVorbereitungProgress";
import type { Level } from "@/types/exam";

/** Vue allégée d'une leçon — le contenu complet reste sur le serveur. */
export interface LessonCard {
  slug: string;
  track: string;
  title: string;
  subtitle: string;
  levels: Level[];
  minutes: number;
  exerciseCount: number;
}

const LEVEL_FILTERS: { id: "ALLE" | Level; label: string }[] = [
  { id: "ALLE", label: "Alle" },
  { id: "B1", label: "B1" },
  { id: "B2", label: "B2" },
];

export function LessonCatalog({
  lessons,
  tracks,
  authenticated,
  initialProgress,
}: {
  lessons: LessonCard[];
  tracks: TrackDefinition[];
  authenticated: boolean;
  initialProgress: ProgressMap;
}) {
  const [level, setLevel] = useState<"ALLE" | Level>("ALLE");
  const { progress } = useVorbereitungProgress(authenticated, initialProgress);

  const visible = lessons.filter(
    (lesson) => level === "ALLE" || lesson.levels.includes(level),
  );
  const done = visible.filter((lesson) => progress[lesson.slug]?.completed);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5">
          <span className="text-[13px] text-muted">Niveau</span>
          {LEVEL_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              onClick={() => setLevel(filter.id)}
              aria-pressed={level === filter.id}
              className={
                "rounded-sm border px-2.5 py-1 text-[13px] transition-colors duration-100 " +
                (level === filter.id
                  ? "border-accent bg-surface font-medium text-foreground"
                  : "border-border text-muted hover:text-foreground")
              }
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[12px] text-muted">
            {done.length} von {visible.length} Lektionen erledigt
          </span>
          <div className="w-32">
            <ProgressBar
              value={done.length}
              max={Math.max(visible.length, 1)}
            />
          </div>
        </div>
      </div>

      {tracks.map((track) => {
        const trackLessons = visible.filter(
          (lesson) => lesson.track === track.id,
        );
        if (trackLessons.length === 0) return null;

        return (
          <section key={track.id}>
            <h2 className="text-[15px] font-semibold">{track.label}</h2>
            <p className="mb-3 text-[13px] text-muted">{track.description}</p>

            <div className="grid gap-3 sm:grid-cols-2">
              {trackLessons.map((lesson) => {
                const entry = progress[lesson.slug];
                return (
                  <Link
                    key={lesson.slug}
                    href={`/vorbereitung/${lesson.slug}`}
                    className="block focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
                  >
                    <Card className="h-full p-4 transition-colors duration-100 hover:bg-surface">
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-[14px] font-medium">
                          {lesson.title}
                        </h3>
                        {entry?.completed ? (
                          <span className="shrink-0 text-[12px] text-[#15803d]">
                            erledigt
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1 text-[13px] text-muted">
                        {lesson.subtitle}
                      </p>
                      <p className="mt-2.5 flex flex-wrap gap-x-3 gap-y-1 text-[12px] text-muted">
                        <span>{lesson.levels.join(" · ")}</span>
                        <span>{lesson.minutes} Min.</span>
                        {lesson.exerciseCount > 0 ? (
                          <span>{lesson.exerciseCount} Übungen</span>
                        ) : null}
                        {entry?.score != null && entry.maxScore ? (
                          <span>
                            Letztes Ergebnis: {entry.score}/{entry.maxScore}
                          </span>
                        ) : null}
                      </p>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
