"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui";
import { uploadAudioFromBrowser } from "@/lib/upload-audio-client";

interface AudioFile {
  name: string;
  url: string;
}

/**
 * Bibliothèque des audios uploadés (public/uploads/audio). L'upload
 * contextuel se fait dans l'éditeur de Teil ; ici : vue d'ensemble +
 * upload libre.
 */
export function AudioLibrary() {
  const [files, setFiles] = useState<AudioFile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

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
              key={file.url}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
            >
              <span className="font-mono text-[12px]">{file.url}</span>
              <audio src={file.url} controls preload="none" className="h-8" />
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
