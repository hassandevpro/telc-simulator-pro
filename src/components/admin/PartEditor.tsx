"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";
import { uploadAudioFromBrowser } from "@/lib/upload-audio-client";
import type { QuestionType } from "@/types/exam";

export interface PartEditorProps {
  examId: string;
  sectionId: string;
  partId: string;
  questionType: QuestionType;
}

/**
 * Éditeur de Teil (v1) : le contenu structuré (shared + questions avec
 * answerKey) s'édite en JSON, validé côté serveur par le schéma Zod du
 * type — rien d'invalide n'entre en base. L'upload audio (Hören) remplit
 * automatiquement shared.audioUrl. v2 : formulaires visuels par type,
 * construits sur les mêmes schémas.
 */
export function PartEditor({
  examId,
  sectionId,
  partId,
  questionType,
}: PartEditorProps) {
  const [text, setText] = useState("");
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const endpoint = `/api/admin/exams/${examId}/parts/${sectionId}/${partId}`;

  const load = useCallback(async () => {
    const response = await fetch(endpoint);
    if (!response.ok) {
      setError("Inhalt nicht abrufbar.");
      return;
    }
    const data = (await response.json()) as {
      shared: Record<string, unknown>;
      audioUrl: string | null;
      questions: unknown[];
    };
    setAudioUrl(data.audioUrl);
    setText(
      JSON.stringify(
        {
          type: questionType,
          shared: {
            ...data.shared,
            ...(data.audioUrl ? { audioUrl: data.audioUrl } : {}),
          },
          questions: data.questions,
        },
        null,
        2,
      ),
    );
  }, [endpoint, questionType]);

  useEffect(() => {
    // Chargement initial : load est invoqué en callback de promesse —
    // aucun setState synchrone dans le corps de l'effet.
    Promise.resolve().then(load).catch(() => undefined);
  }, [load]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      setError("Kein gültiges JSON.");
      setBusy(false);
      return;
    }
    const response = await fetch(endpoint, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = (await response.json().catch(() => null)) as {
      error?: string;
      details?: { path: (string | number)[]; message: string }[];
      questionCount?: number;
    } | null;
    if (!response.ok) {
      const detail = data?.details
        ?.slice(0, 3)
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join(" · ");
      setError(detail ?? data?.error ?? "Speichern fehlgeschlagen.");
    } else {
      setStatus(`Gespeichert (${data?.questionCount ?? 0} Fragen).`);
    }
    setBusy(false);
  };

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    setStatus(null);
    const { url: uploadedUrl, error: uploadError } =
      await uploadAudioFromBrowser(file);
    if (uploadError || !uploadedUrl) {
      setError(uploadError ?? "Upload fehlgeschlagen.");
      setBusy(false);
      return;
    }

    // Persiste IMMÉDIATEMENT l'association audio→Teil (PATCH ciblé sur
    // audioUrl), indépendamment du gros JSON : l'audio est enregistré en
    // un seul geste, sans exiger que le reste du Teil soit déjà valide.
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrl: uploadedUrl }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Audio konnte nicht gespeichert werden.");
      setBusy(false);
      return;
    }

    setAudioUrl(uploadedUrl);
    // Reflète aussi l'URL dans le JSON en cours d'édition, pour cohérence.
    try {
      const parsed = JSON.parse(text) as { shared?: Record<string, unknown> };
      parsed.shared = { ...(parsed.shared ?? {}), audioUrl: uploadedUrl };
      setText(JSON.stringify(parsed, null, 2));
    } catch {
      // JSON en cours d'édition invalide : l'audio est déjà persisté en
      // base, la synchro du textarea se fera au prochain « Zurücksetzen ».
    }
    setStatus("Audio gespeichert und mit diesem Teil verknüpft.");
    setBusy(false);
  };

  const removeAudio = async () => {
    setBusy(true);
    setError(null);
    setStatus(null);
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ audioUrl: null }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Audio konnte nicht entfernt werden.");
      setBusy(false);
      return;
    }
    setAudioUrl(null);
    try {
      const parsed = JSON.parse(text) as { shared?: Record<string, unknown> };
      if (parsed.shared) delete parsed.shared.audioUrl;
      setText(JSON.stringify(parsed, null, 2));
    } catch {
      // idem upload : la base fait foi.
    }
    setStatus("Audio entfernt.");
    setBusy(false);
  };

  return (
    <div className="space-y-3">
      {sectionId === "hoeren" ? (
        <Card muted className="space-y-3 p-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-[13px]">
              Audio für diesen Teil hochladen
              <span className="ml-2 text-[12px] text-muted">
                (wird sofort gespeichert)
              </span>
            </span>
            <input
              type="file"
              accept="audio/*"
              disabled={busy}
              className="text-[12px]"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
              }}
            />
          </div>
          {audioUrl ? (
            <div className="flex flex-wrap items-center gap-3 border-t border-border pt-3">
              <span className="text-[12px] text-muted">Aktuelles Audio:</span>
              <audio src={audioUrl} controls preload="none" className="h-8" />
              <Button variant="secondary" disabled={busy} onClick={() => void removeAudio()}>
                Entfernen
              </Button>
            </div>
          ) : (
            <p className="border-t border-border pt-3 text-[12px] text-muted">
              Noch kein Audio mit diesem Teil verknüpft.
            </p>
          )}
        </Card>
      ) : null}

      <textarea
        aria-label="Inhalt (JSON)"
        value={text}
        onChange={(event) => setText(event.target.value)}
        spellCheck={false}
        className="min-h-[28rem] w-full resize-y border border-border bg-background p-3 font-mono text-[12px] leading-relaxed rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
      />

      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      {status ? <p className="text-[13px] text-muted">{status}</p> : null}

      <div className="flex justify-end gap-2">
        <Button variant="secondary" disabled={busy} onClick={() => void load()}>
          Zurücksetzen
        </Button>
        <Button variant="primary" disabled={busy} onClick={() => void save()}>
          {busy ? "Wird gespeichert…" : "Speichern"}
        </Button>
      </div>
    </div>
  );
}
