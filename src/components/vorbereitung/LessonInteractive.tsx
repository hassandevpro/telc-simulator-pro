"use client";

import Link from "next/link";
import { Button, Card } from "@/components/ui";
import type { Exercise } from "@/content/vorbereitung";
import {
  useVorbereitungProgress,
  type LessonProgressEntry,
} from "@/hooks/useVorbereitungProgress";
import { ExerciseRunner } from "./ExerciseRunner";

/**
 * Partie interactive d'une leçon : exercices corrigés + marquage « erledigt ».
 * Regroupés dans UN seul composant client pour n'ouvrir qu'une instance du
 * hook de progression (une seule hydratation, une seule source de vérité).
 */
export function LessonInteractive({
  slug,
  exercises,
  authenticated,
  initialEntry,
}: {
  slug: string;
  exercises: Exercise[];
  authenticated: boolean;
  initialEntry?: LessonProgressEntry;
}) {
  const { progress, save } = useVorbereitungProgress(
    authenticated,
    initialEntry ? { [slug]: initialEntry } : {},
  );

  const entry = progress[slug];
  const completed = entry?.completed ?? false;

  return (
    <div className="space-y-8">
      {exercises.length > 0 ? (
        <section>
          <h2 className="mb-3 text-[15px] font-semibold">Übungen</h2>
          <ExerciseRunner
            exercises={exercises}
            onScored={(score, maxScore) => save(slug, { score, maxScore })}
          />
        </section>
      ) : null}

      <Card muted className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div>
          <p className="text-[14px] font-medium">
            {completed ? "Als erledigt markiert" : "Diese Lektion abschließen"}
          </p>
          <p className="text-[12px] text-muted">
            {authenticated
              ? "Dein Fortschritt wird deinem Konto gespeichert."
              : "Dein Fortschritt wird nur in diesem Browser gespeichert — melde dich an, um ihn zu behalten."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!authenticated ? (
            <Link href="/login" className="text-[13px] text-muted hover:text-foreground">
              Anmelden
            </Link>
          ) : null}
          <Button
            variant={completed ? "secondary" : "primary"}
            onClick={() => save(slug, { completed: !completed })}
          >
            {completed ? "Markierung entfernen" : "Als erledigt markieren"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
