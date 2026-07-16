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

export interface SessionListProps {
  /** Id du candidat connecté : seules SES sessions sont affichées. Le
   * stockage v1 étant partagé par navigateur, sans ce filtre un poste
   * partagé montrerait les sessions de tous les utilisateurs. */
  ownerKey?: string;
}

/**
 * Historique des sessions du candidat (v1 : LocalStorage de ce navigateur),
 * cloisonné à l'utilisateur courant.
 */
export function SessionList({ ownerKey }: SessionListProps) {
  const [sessions, setSessions] = useState<PersistedSessionState[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void sessionRepository.listSessions().then((list) => {
      // N'affiche QUE les sessions de l'utilisateur connecté. Les sessions
      // sans propriétaire (créées avant le cloisonnement) ne sont montrées
      // à personne — on ne fuite jamais l'historique d'autrui.
      setSessions(
        ownerKey ? list.filter((s) => s.ownerKey === ownerKey) : [],
      );
      setLoaded(true);
    });
  }, [ownerKey]);

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
