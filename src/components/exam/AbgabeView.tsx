"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { sessionRepository } from "@/lib/repository";
import { countWords } from "@/lib/text";
import { useExamSessionStore } from "@/stores/examSessionStore";
import type { SessionScore } from "@/types/scoring";
import { SubmitDialog } from "./SubmitDialog";

export interface AbgabePartMeta {
  sectionLabel: string;
  partLabel: string;
  questionIds: string[];
  isWriting: boolean;
}

export interface AbgabeViewProps {
  sessionId: string;
  parts: AbgabePartMeta[];
}

/**
 * Remise finale : récapitulatif répondu/total par Teil, puis confirmation
 * bloquante. À la confirmation : flush des réponses → correction côté
 * serveur (les clés ne descendent jamais) → session close en SCORED →
 * résultats. Une session expirée passe par le même chemin, avec le
 * libellé « Zeit abgelaufen ».
 */
export function AbgabeView({ sessionId, parts }: AbgabeViewProps) {
  const router = useRouter();
  const answers = useExamSessionStore((state) => state.answers);
  const status = useExamSessionStore((state) => state.status);
  const setStatus = useExamSessionStore((state) => state.setStatus);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const summary = useMemo(() => {
    return parts.map((part) => {
      if (part.isWriting) {
        const text = part.questionIds
          .map((id) => answers[id])
          .find((value) => typeof value === "string" && value.trim() !== "");
        return { ...part, answered: text ? 1 : 0, total: 1, words: text ? countWords(text) : 0 };
      }
      const answered = part.questionIds.filter(
        (id) => (answers[id] ?? null) !== null,
      ).length;
      return { ...part, answered, total: part.questionIds.length, words: null };
    });
  }, [parts, answers]);

  const objective = summary.filter((row) => !row.isWriting);
  const answeredCount = objective.reduce((sum, row) => sum + row.answered, 0);
  const itemCount = objective.reduce((sum, row) => sum + row.total, 0);

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      // Persiste D'ABORD les dernières réponses (le store est la source
      // vivante), en attendant l'écriture serveur, PUIS relit l'état complet
      // — sinon la correction porterait sur des réponses périmées.
      await sessionRepository.saveAnswers(sessionId, answers);
      const state = await sessionRepository.load(sessionId);
      if (!state) throw new Error("Session introuvable.");

      const response = await fetch("/api/sessions/score", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ examId: state.examId, answers: state.answers }),
      });
      if (!response.ok) throw new Error("La correction a échoué.");
      const score = (await response.json()) as SessionScore;

      await sessionRepository.save({
        ...state,
        status: "SCORED",
        submittedAt: state.submittedAt ?? Date.now(),
        result: score,
      });
      setStatus("SCORED");
      router.replace(`/results/${sessionId}`);
    } catch (cause) {
      setSubmitting(false);
      setDialogOpen(false);
      setError(
        cause instanceof Error ? cause.message : "Une erreur est survenue.",
      );
    }
  };

  if (status === "SCORED") {
    return (
      <Card muted className="p-4 text-[13px]">
        Diese Prüfung wurde bereits abgegeben und ausgewertet.{" "}
        <Link
          href={`/results/${sessionId}`}
          className="text-accent underline underline-offset-2"
        >
          Zum Ergebnis
        </Link>
      </Card>
    );
  }

  const expired = status === "EXPIRED";

  return (
    <div>
      {expired ? (
        <Card muted className="mb-4 border-danger p-3 text-[13px]">
          <span className="font-semibold text-danger">
            Die Prüfungszeit ist abgelaufen.
          </span>{" "}
          Ihre gespeicherten Antworten werden ausgewertet.
        </Card>
      ) : null}

      <Card className="divide-y divide-border">
        {summary.map((row, index) => (
          <div
            key={index}
            className="flex items-center justify-between px-4 py-2.5 text-[13px]"
          >
            <span>
              {row.sectionLabel} · {row.partLabel}
            </span>
            <span className="font-mono tabular-nums text-muted">
              {row.isWriting
                ? row.answered > 0
                  ? `bearbeitet (${row.words} Wörter)`
                  : "nicht bearbeitet"
                : `${row.answered} / ${row.total} beantwortet`}
            </span>
          </div>
        ))}
      </Card>

      {error ? <p className="mt-3 text-[13px] text-danger">{error}</p> : null}

      <div className="mt-5 flex justify-end">
        <Button
          variant="primary"
          onClick={() => (expired ? void submit() : setDialogOpen(true))}
          disabled={submitting}
        >
          {expired
            ? submitting
              ? "Wird ausgewertet…"
              : "Prüfung auswerten"
            : "Prüfung abgeben"}
        </Button>
      </div>

      <SubmitDialog
        open={dialogOpen}
        answeredCount={answeredCount}
        itemCount={itemCount}
        submitting={submitting}
        onCancel={() => setDialogOpen(false)}
        onConfirm={() => void submit()}
      />
    </div>
  );
}
