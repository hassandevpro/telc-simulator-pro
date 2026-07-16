"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Button, Card, Select } from "@/components/ui";

interface ExamRow {
  id: string;
  title: string;
  level: string;
  isPublished: boolean;
  questionCount: number;
}

/**
 * Gestion des examens : création (les 10 Teile sont dérivés automatiquement
 * de la structure officielle), publication, suppression, import du
 * Modelltest de démonstration, accès à l'éditeur de contenu.
 */
export function ExamsManager() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("B2");
  const [withAudio, setWithAudio] = useState(false);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/exams");
    if (!response.ok) {
      setError("Liste nicht abrufbar (Datenbank erreichbar?).");
      return;
    }
    setExams((await response.json()) as ExamRow[]);
    setError(null);
  }, []);

  useEffect(() => {
    // Chargement initial : load est invoqué en callback de promesse —
    // aucun setState synchrone dans le corps de l'effet.
    Promise.resolve().then(load).catch(() => undefined);
  }, [load]);

  const call = async (input: string, init?: RequestInit) => {
    setBusy(true);
    setError(null);
    const response = await fetch(input, init);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Aktion fehlgeschlagen.");
    }
    await load();
    setBusy(false);
  };

  const create = () =>
    call("/api/admin/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, level }),
    }).then(() => setTitle(""));

  /**
   * Génère un examen INÉDIT (les 10 Teile, 62 questions et clés sont produits
   * par le générateur) et, si demandé, synthétise l'audio Hören en allemand.
   * L'examen est créé même si l'audio échoue : le message décrit alors le
   * problème (clé ElevenLabs manquante/invalide, quota…).
   */
  const generate = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const response = await fetch("/api/admin/exams/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        level,
        withAudio,
        title: title.trim() || undefined,
      }),
    });
    const data = (await response.json().catch(() => null)) as {
      title?: string;
      questionCount?: number;
      audio?: {
        requested: boolean;
        status: string;
        generated?: string[];
        error?: { message?: string };
      };
      error?: string;
      details?: string[];
    } | null;

    if (!response.ok) {
      setError(
        data?.details?.length
          ? `${data.error} (${data.details.length} Problem[e])`
          : (data?.error ?? "Generierung fehlgeschlagen."),
      );
    } else {
      let msg = `Testsatz erstellt: „${data?.title}“ (${data?.questionCount} Fragen).`;
      const a = data?.audio;
      if (a?.requested) {
        const n = a.generated?.length ?? 0;
        if (a.status === "done") msg += ` Audio: ${n}/3 erzeugt.`;
        else if (a.status === "partial")
          msg += ` Audio nur ${n}/3 — ${a.error?.message}`;
        else msg += ` Audio nicht erzeugt: ${a.error?.message}`;
      }
      setNotice(msg);
      setTitle("");
    }
    await load();
    setBusy(false);
  };

  const importDemo = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    const response = await fetch("/api/admin/exams/import-demo", {
      method: "POST",
    });
    const data = (await response.json().catch(() => null)) as {
      alreadyExists?: boolean;
      error?: string;
    } | null;
    if (!response.ok) {
      setError(data?.error ?? "Aktion fehlgeschlagen.");
    } else if (data?.alreadyExists) {
      setError(
        "Der Demo-Modelltest existiert bereits — kein Duplikat erstellt.",
      );
    }
    await load();
    setBusy(false);
  };

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-end gap-3 p-4">
        <div className="min-w-64 flex-1">
          <label htmlFor="exam-title" className="text-[13px] font-medium">
            Titel
          </label>
          <input
            id="exam-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="telc Deutsch B2 — Modelltest 2"
            className="mt-1 w-full border border-border bg-background px-2.5 py-1.5 text-[13px] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
        </div>
        <div>
          <label htmlFor="exam-level" className="text-[13px] font-medium">
            Niveau
          </label>
          <div className="mt-1">
            <Select
              id="exam-level"
              options={[
                { value: "B1", label: "B1" },
                { value: "B2", label: "B2" },
              ]}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
            />
          </div>
        </div>
        <Button
          variant="primary"
          disabled={busy || title.trim().length < 3}
          onClick={() => void create()}
        >
          Examen erstellen
        </Button>
        <Button
          variant="primary"
          disabled={busy}
          onClick={() => void generate()}
        >
          {busy && withAudio ? "Generiere (inkl. Audio)…" : "Testsatz generieren"}
        </Button>
        <label className="flex items-center gap-1.5 text-[13px] select-none">
          <input
            type="checkbox"
            checked={withAudio}
            onChange={(event) => setWithAudio(event.target.checked)}
            className="h-3.5 w-3.5 accent-accent"
          />
          Hören-Audio (ElevenLabs)
        </label>
        <Button
          variant="secondary"
          disabled={busy}
          onClick={() => void importDemo()}
        >
          Demo-Modelltest importieren
        </Button>
      </Card>

      {notice ? <p className="text-[13px] text-accent">{notice}</p> : null}
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}

      <Card className="divide-y divide-border">
        {exams.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">Keine Examen in der Datenbank.</p>
        ) : (
          exams.map((exam) => (
            <div
              key={exam.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
            >
              <div>
                <p className="font-medium">{exam.title}</p>
                <p className="text-[12px] text-muted">
                  {exam.level} · {exam.questionCount} Fragen ·{" "}
                  {exam.isPublished ? "veröffentlicht" : "Entwurf"}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={`/admin/exams/${exam.id}`}
                  className="text-accent underline underline-offset-2"
                >
                  Inhalte
                </Link>
                <Button
                  variant="secondary"
                  disabled={busy}
                  onClick={() =>
                    void call(`/api/admin/exams/${exam.id}`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ isPublished: !exam.isPublished }),
                    })
                  }
                >
                  {exam.isPublished ? "Zurückziehen" : "Veröffentlichen"}
                </Button>
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`„${exam.title}“ endgültig löschen?`)) {
                      void call(`/api/admin/exams/${exam.id}`, {
                        method: "DELETE",
                      });
                    }
                  }}
                >
                  Löschen
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
