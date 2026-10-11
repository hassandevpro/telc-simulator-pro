"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { uploadAudioFromBrowser } from "@/lib/upload-audio-client";

interface AudioFile {
  name: string;
  /** Chemin dans le bucket PRIVÉ (aucune URL publique n'existe). */
  path: string;
}

/**
 * Bibliothèque des audios uploadés (bucket privé « audio »). L'upload
 * contextuel se fait dans l'éditeur de Teil ; ici : vue d'ensemble +
 * upload libre. L'écoute passe par une URL signée admin de courte durée.
 */
export function AudioLibrary() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ path: string; url: string } | null>(null);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/audio");
    if (response.ok) setFiles((await response.json()) as AudioFile[]);
  }, []);

  useEffect(() => {
    // Chargement initial : load est invoqué en callback de promesse —
    // aucun setState synchrone dans le corps de l'effet.
    Promise.resolve().then(load).catch(() => undefined);
  }, [load]);

  const upload = async (file: File) => {
    setBusy(true);
    setError(null);
    const { error: uploadError } = await uploadAudioFromBrowser(file);
    if (uploadError) {
      setError(uploadError);
    }
    await load();
    setBusy(false);
  };

  const listen = async (path: string) => {
    setError(null);
    const response = await fetch(
      `/api/admin/audio/preview?path=${encodeURIComponent(path)}`,
    );
    const data = (await response.json().catch(() => null)) as {
      url?: string;
      error?: string;
    } | null;
    if (!response.ok || !data?.url) {
      setError(data?.error ?? "Vorschau nicht verfügbar.");
      return;
    }
    setPreview({ path, url: data.url });
  };

  return (
    <div className="space-y-3">
      <Card muted className="flex flex-wrap items-center justify-between gap-3 p-3">
        <span className="text-[13px]">Audiodatei hochladen (max. 20 MB)</span>
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
      </Card>
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      <Card className="divide-y divide-border">
        {files.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">
            Noch keine hochgeladenen Audiodateien.
          </p>
        ) : (
          files.map((file) => (
            <div
              key={file.path}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
            >
              <span className="font-mono text-[12px]">{file.path}</span>
              {preview?.path === file.path ? (
                <audio src={preview.url} controls autoPlay className="h-8" />
              ) : (
                <button
                  type="button"
                  onClick={() => void listen(file.path)}
                  className="text-[12px] text-accent underline underline-offset-2"
                >
                  Anhören
                </button>
              )}
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
