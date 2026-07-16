"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui";
import { sessionRepository } from "@/lib/repository";
import type { PersistedSessionState } from "@/types/session";

const STATUS_LABELS: Record<string, string> = {
  AUDIO_CHECK: "Audiotest ausstehend",
  IN_PROGRESS: "In Bearbeitung",
  SUBMITTED: "Abgegeben",
  EXPIRED: "Zeit abgelaufen",
  SCORED: "Ausgewertet",
};

/**
 * Historique des sessions du candidat (v1 : LocalStorage de ce navigateur).
 */
export function SessionList() {
  const [sessions, setSessions] = useState<PersistedSessionState[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void sessionRepository.listSessions().then((list) => {
      setSessions(list);
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return <p className="text-[13px] text-muted">Wird geladen…</p>;
  }

  if (sessions.length === 0) {
    return (
      <Card muted className="p-4 text-[13px] text-muted">
        Noch keine Prüfungssitzungen auf diesem Gerät.
      </Card>
    );
  }

  return (
    <Card className="divide-y divide-border">
      {sessions.map((session) => (
        <div
          key={session.sessionId}
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]"
        >
          <div>
            <p className="font-medium">{session.sessionId}</p>
            <p className="text-[12px] text-muted">
              {STATUS_LABELS[session.status] ?? session.status} ·{" "}
              {new Date(session.updatedAt).toLocaleString("de-DE", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </p>
          </div>
          <div className="flex items-center gap-4 font-mono tabular-nums">
            {session.result ? (
              <span>
                {session.result.objectivePoints} /{" "}
                {session.result.objectiveMaxPoints}
              </span>
            ) : null}
            <Link
              href={
                session.status === "SCORED"
                  ? `/results/${session.sessionId}`
                  : `/session/${session.sessionId}/abgabe`
              }
              className="text-accent underline underline-offset-2"
            >
              {session.status === "SCORED" ? "Ergebnis" : "Öffnen"}
            </Link>
          </div>
        </div>
      ))}
    </Card>
  );
}
