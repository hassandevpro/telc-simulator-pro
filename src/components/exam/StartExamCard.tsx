"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { getStructureForLevel } from "@/config/exam-structure";
import { sessionRepository } from "@/lib/repository";
import { createInitialSessionState } from "@/lib/session-factory";
import type { Level } from "@/types/exam";

export interface StartExamCardProps {
  examId: string;
  examTitle: string;
  level: string;
  /** Id du candidat connecté — estampillé sur la session pour cloisonner
   * l'historique par utilisateur sur un poste partagé. */
  ownerKey?: string;
  /** Le candidat a déjà terminé cet examen (rejouable sans coût de crédit). */
  done?: boolean;
  /** Bloqué faute de crédits (et examen pas encore fait). */
  blocked?: boolean;
}

/**
 * Démarrage d'une nouvelle session (v1 LocalStorage-first) :
 * création de l'état initial (AUDIO_CHECK, sans ancre) avec l'examId
 * choisi, cookie `telc-exam-{sessionId}` pour que les pages SERVEUR
 * résolvent le bon contenu, puis entrée — le bootstrap redirige vers
 * le test casque. v2 : POST /api/sessions.
 */
export function StartExamCard({
  examId,
  examTitle,
  level,
  ownerKey,
  done = false,
  blocked = false,
}: StartExamCardProps) {
  const router = useRouter();
  const [starting, setStarting] = useState(false);

  const start = async () => {
    setStarting(true);
    const sessionId = crypto.randomUUID().slice(0, 8);
    const state = createInitialSessionState(
      sessionId,
      // Structure du bon niveau (B1 : 150 min · B2 : 140 min) — le reste du
      // squelette est identique entre les deux niveaux.
      getStructureForLevel(level as Level),
      examId,
      ownerKey,
    );
    await sessionRepository.save(state);
    document.cookie = `telc-exam-${sessionId}=${encodeURIComponent(examId)}; path=/; max-age=${60 * 60 * 24 * 30}`;
    router.push(`/session/${sessionId}/lesen/teil-1`);
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-[14px] font-medium">
          {examTitle}
          {done ? (
            <span className="ml-2 rounded-sm bg-surface px-1.5 py-0.5 align-middle text-[11px] font-normal text-muted">
              ✓ bereits absolviert
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[12px] text-muted">
          {level} · Schriftliche Prüfung · 140 Minuten · Audiotest vor Beginn
          {done ? " · Wiederholung ohne Credit" : " · 1 Credit"}
        </p>
      </div>
      {blocked ? (
        <span className="text-[12px] text-muted">
          Keine Credits —{" "}
          <a href="/pricing" className="text-accent underline underline-offset-2">
            Plan verlängern
          </a>
        </span>
      ) : (
        <Button variant="primary" onClick={() => void start()} disabled={starting}>
          {starting ? "Wird gestartet…" : "Neue Prüfung starten"}
        </Button>
      )}
    </Card>
  );
}
