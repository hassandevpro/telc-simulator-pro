"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { EXAM_STRUCTURES } from "@/config/exam-structure";
import { buildPageStops, sessionPath } from "@/lib/exam-navigation";
import { sessionRepository } from "@/lib/repository";
import { createInitialSessionState } from "@/lib/session-factory";
import { useExamSessionStore } from "@/stores/examSessionStore";
import { useTimerStore } from "@/stores/timerStore";

const SAMPLE_SRC = "/audio/sound-check.wav";

export interface AudioCheckProps {
  sessionId: string;
}

/**
 * Test casque OBLIGATOIRE avant l'épreuve (ARCHITECTURE.md §6).
 * L'échantillon est rejouable à volonté (c'est un réglage, pas un audio
 * d'épreuve), le volume est ajustable, et la confirmation exige d'avoir
 * réellement écouté au moins une fois.
 * À la validation : `startedAt` est posé — UNE seule fois — la session
 * passe IN_PROGRESS et le candidat entre dans le premier Teil. Revenir
 * ensuite sur cette page ne repose jamais l'ancre du timer.
 */
export function AudioCheck({ sessionId }: AudioCheckProps) {
  const router = useRouter();
  const structure = EXAM_STRUCTURES.B2;

  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(80);
  const [hasPlayedSample, setHasPlayedSample] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [starting, setStarting] = useState(false);

  const setStatus = useExamSessionStore((state) => state.setStatus);
  const initializeTimer = useTimerStore((state) => state.initialize);

  const playSample = () => {
    const element = audioRef.current;
    if (!element) return;
    element.volume = volume / 100;
    element.currentTime = 0;
    void element.play();
    setHasPlayedSample(true);
  };

  const changeVolume = (value: number) => {
    setVolume(value);
    if (audioRef.current) {
      audioRef.current.volume = value / 100;
    }
  };

  const startExam = async () => {
    setStarting(true);

    let state = await sessionRepository.load(sessionId);
    if (!state) {
      state = createInitialSessionState(sessionId, structure);
    }

    // Session déjà close : on ne rouvre rien.
    if (state.status === "SUBMITTED" || state.status === "EXPIRED") {
      router.replace(`/session/${sessionId}/abgabe`);
      return;
    }

    if (state.status === "AUDIO_CHECK") {
      state = {
        ...state,
        status: "IN_PROGRESS",
        // L'ancre n'est posée que si elle n'existe pas encore.
        startedAt: state.startedAt ?? Date.now(),
      };
      await sessionRepository.save(state);
    }

    setStatus(state.status);
    if (state.startedAt !== null) {
      initializeTimer(sessionId, state.startedAt, state.durationSeconds);
    }
    router.replace(sessionPath(sessionId, buildPageStops(structure)[0]));
  };

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      <audio ref={audioRef} src={SAMPLE_SRC} preload="auto" />

      <h1 className="text-base font-semibold">Audiotest</h1>
      <p className="mt-1 text-[13px] text-muted">
        Bevor die Prüfung beginnt, überprüfen Sie bitte Ihre Kopfhörer.
        Die Prüfungszeit läuft erst nach diesem Test.
      </p>

      <Card className="mt-5 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[13px] font-medium">1. Ton abspielen</span>
          <Button variant="secondary" onClick={playSample}>
            {hasPlayedSample ? "Erneut abspielen" : "Ton abspielen"}
          </Button>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <label
            htmlFor="audio-check-volume"
            className="text-[13px] font-medium"
          >
            2. Lautstärke einstellen
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="audio-check-volume"
              type="range"
              min={0}
              max={100}
              value={volume}
              onChange={(event) => changeVolume(Number(event.target.value))}
              className="w-full accent-accent"
            />
            <span className="w-10 shrink-0 text-right font-mono text-[12px] tabular-nums text-muted">
              {volume} %
            </span>
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <label className="flex cursor-pointer items-baseline gap-2.5 text-[13px]">
            <input
              type="checkbox"
              checked={confirmed}
              disabled={!hasPlayedSample}
              onChange={(event) => setConfirmed(event.target.checked)}
              className="translate-y-0.5 accent-accent"
            />
            <span className={hasPlayedSample ? "" : "text-muted"}>
              3. Ich höre den Ton deutlich.
              {!hasPlayedSample
                ? " (Spielen Sie zuerst den Ton ab.)"
                : ""}
            </span>
          </label>
        </div>
      </Card>

      <div className="mt-5 flex justify-end">
        <Button
          variant="primary"
          disabled={!confirmed || starting}
          onClick={() => void startExam()}
        >
          {starting ? "Prüfung wird gestartet…" : "Prüfung starten"}
        </Button>
      </div>
    </div>
  );
}
