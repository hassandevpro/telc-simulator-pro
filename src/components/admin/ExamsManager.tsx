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
  const [title, setTitle] = useState("");
  const [level, setLevel] = useState("B2");
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
              options={[{ value: "B2", label: "B2" }]}
              value={level}
              onChange={(event) => setLevel(event.target.value)}
              placeholder="B2"
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
          variant="secondary"
          disabled={busy}
          onClick={() =>
            void call("/api/admin/exams/import-demo", { method: "POST" })
          }
        >
          Demo-Modelltest importieren
        </Button>
      </Card>

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
