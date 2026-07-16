"use client";

import { useRef, useState } from "react";
import { Button, Card, ProgressBar } from "@/components/ui";
import { useAudioOnce } from "@/hooks/useAudioOnce";

export interface AudioPlayerProps {
  sessionId: string;
  /** Identifiant stable de l'audio dans la session, ex. "hoeren/teil-1". */
  audioId: string;
  src: string;
}

function formatSeconds(total: number): string {
  const minutes = Math.floor(total / 60);
  const seconds = Math.floor(total % 60);
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * Lecteur d'examen (ARCHITECTURE.md §6) : lecture UNIQUE, sans barre
 * cliquable, sans pause, sans vitesse. Trois états :
 *  1. prêt — bouton de démarrage + avertissement « une seule écoute » ;
 *  2. en lecture — temps écoulé + barre non interactive, nav verrouillée ;
 *  3. consommé — « Audio bereits abgespielt », les réponses restent
 *     accessibles.
 */
export function AudioPlayer({ sessionId, audioId, src }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);

  const { hasPlayed, isPlaying, onPlay, onEnded, onError, onPause } =
    useAudioOnce(sessionId, audioId);

  const start = () => {
    void audioRef.current?.play();
  };

  return (
    <Card muted className="mb-6 p-4">
      {/* Élément audio sans contrôles natifs : aucune interaction directe. */}
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onPlay={onPlay}
        onEnded={onEnded}
        onError={onError}
        onPause={onPause}
        onTimeUpdate={(event) => setElapsed(event.currentTarget.currentTime)}
        onLoadedMetadata={(event) =>
          setDuration(event.currentTarget.duration)
        }
      />

      {isPlaying ? (
        <div>
          <div className="flex items-baseline justify-between">
            <span className="text-[13px] font-medium">
              Wiedergabe läuft — die Navigation ist gesperrt.
            </span>
            <span className="font-mono text-[13px] tabular-nums text-muted">
              {formatSeconds(elapsed)}
              {duration ? ` / ${formatSeconds(duration)}` : ""}
            </span>
          </div>
          <div className="mt-2">
            <ProgressBar
              value={elapsed}
              max={duration ?? Math.max(elapsed, 1)}
              label="Wiedergabefortschritt"
            />
          </div>
          <p className="mt-2 text-[12px] text-muted">
            Beantworten Sie die Aufgaben, während Sie hören.
          </p>
        </div>
      ) : hasPlayed ? (
        <p className="text-[13px] text-muted">
          Audio bereits abgespielt. Eine erneute Wiedergabe ist nicht möglich —
          Ihre Antworten können Sie weiterhin ändern.
        </p>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[13px] font-medium">
              Sie hören den Text nur EINMAL.
            </p>
            <p className="mt-0.5 text-[12px] text-muted">
              Während der Wiedergabe ist die Navigation gesperrt. Beantworten
              Sie die Aufgaben beim Hören.
            </p>
          </div>
          <Button variant="primary" onClick={start}>
            Wiedergabe starten
          </Button>
        </div>
      )}
    </Card>
  );
}
