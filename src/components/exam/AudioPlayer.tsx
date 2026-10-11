"use client";

import { useRef, useState } from "react";
import { Button, Card, ProgressBar } from "@/components/ui";
import { useAudioOnce } from "@/hooks/useAudioOnce";

export interface AudioPlayerProps {
  sessionId: string;
  /** Identifiant stable de l'audio dans la session, ex. "hoeren/teil-1". */
  audioId: string;
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
export function AudioPlayer({ sessionId, audioId }: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  // URL signée déjà reçue : un second clic (lecture refusée par le
  // navigateur) la réutilise au lieu de consommer une nouvelle émission.
  const issuedUrlRef = useRef<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [duration, setDuration] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const { hasPlayed, isPlaying, onPlay, onEnded, onError, onPause } =
    useAudioOnce(sessionId, audioId);

  /**
   * Le fichier n'est jamais dans la page : à la demande, le serveur vérifie
   * l'identité, la session, l'état de l'épreuve et le nombre d'émissions
   * (lib/audio-access.ts), puis renvoie une URL signée de courte durée.
   */
  const start = async () => {
    const element = audioRef.current;
    if (!element || loading) return;
    setProblem(null);
    try {
      if (!issuedUrlRef.current) {
        setLoading(true);
        const response = await fetch(
          `/api/sessions/${encodeURIComponent(sessionId)}/audio/${audioId}`,
          { method: "POST" },
        );
        const data = (await response.json().catch(() => null)) as {
          url?: string;
          error?: string;
        } | null;
        if (!response.ok || !data?.url) {
          setProblem(data?.error ?? "Das Audio konnte nicht geladen werden.");
          return;
        }
        issuedUrlRef.current = data.url;
        element.src = data.url;
      }
      await element.play();
    } catch {
      // Lecture refusée (geste utilisateur expiré, réseau) : l'URL reçue est
      // conservée, un nouveau clic relance sans nouvelle demande au serveur.
      setProblem(
        "Die Wiedergabe konnte nicht gestartet werden. Bitte erneut auf „Wiedergabe starten“ klicken.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card muted className="mb-6 p-4">
      {/* Élément audio sans contrôles natifs ni source : la source n'arrive
          qu'avec l'URL signée, au clic (voir start). */}
      <audio
        ref={audioRef}
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
        <div>
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
            <Button
              variant="primary"
              disabled={loading}
              onClick={() => void start()}
            >
              {loading ? "Audio wird geladen…" : "Wiedergabe starten"}
            </Button>
          </div>
          {problem ? (
            <p className="mt-2 text-[12px] text-danger">{problem}</p>
          ) : null}
        </div>
      )}
    </Card>
  );
}
