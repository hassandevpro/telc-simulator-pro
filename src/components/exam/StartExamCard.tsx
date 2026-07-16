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
}

/**
 * Démarrage d'une nouvelle session (v1 LocalStorage-first) :
 * création de l'état initial (AUDIO_CHECK, sans ancre) avec l'examId
 * choisi, cookie `telc-exam-{sessionId}` pour que les pages SERVEUR
 * résolvent le bon contenu, puis entrée — le bootstrap redirige vers
 * le test casque. v2 : POST /api/sessions.
 */
export function StartExamCard({ examId, examTitle, level }: StartExamCardProps) {
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
    );
    await sessionRepository.save(state);
    document.cookie = `telc-exam-${sessionId}=${encodeURIComponent(examId)}; path=/; max-age=${60 * 60 * 24 * 30}`;
    router.push(`/session/${sessionId}/lesen/teil-1`);
  };

  return (
    <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
      <div>
        <p className="text-[14px] font-medium">{examTitle}</p>
        <p className="mt-0.5 text-[12px] text-muted">
          {level} · Schriftliche Prüfung · 140 Minuten · Audiotest vor Beginn
        </p>
      </div>
      <Button variant="primary" onClick={() => void start()} disabled={starting}>
        {starting ? "Wird gestartet…" : "Neue Prüfung starten"}
      </Button>
    </Card>
  );
}
