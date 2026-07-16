"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { sessionRepository } from "@/lib/repository";
import type { PersistedSessionState } from "@/types/session";
import { PassProbability } from "./PassProbability";
import { ScoreSummary } from "./ScoreSummary";
import { SectionBreakdown } from "./SectionBreakdown";

/**
 * Détail d'un résultat — charge la session depuis le repository (v1 :
 * LocalStorage, donc côté client) et assemble les trois blocs d'affichage.
 * v2 : deviendra une lecture serveur du modèle Result en base.
 */
export function ResultView({ sessionId }: { sessionId: string }) {
  const [state, setState] = useState<PersistedSessionState | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void sessionRepository.load(sessionId).then((session) => {
      if (cancelled) return;
      setState(session);
      setLoaded(true);
    });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  if (!loaded) {
    return <p className="text-[13px] text-muted">Wird geladen…</p>;
  }

  const score = state?.result ?? null;
  if (!state || !score) {
    return (
      <Card muted className="p-4 text-[13px]">
        Für diese Sitzung liegt kein Ergebnis vor.
        {state && state.status !== "SCORED" ? (
          <>
            {" "}
            <Link
              href={`/session/${sessionId}/abgabe`}
              className="text-accent underline underline-offset-2"
            >
              Zur Abgabe
            </Link>
          </>
        ) : null}
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <ScoreSummary score={score} />
      <PassProbability score={score} />
      <SectionBreakdown score={score} />
      <p className="text-[12px] text-muted">
        Ausgewertet am{" "}
        {new Date(score.scoredAt).toLocaleString("de-DE", {
          dateStyle: "medium",
          timeStyle: "short",
        })}
      </p>
    </div>
  );
}
