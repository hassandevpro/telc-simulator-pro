"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button, Card } from "@/components/ui";
import { SessionWriteError, sessionRepository } from "@/lib/repository";
import { countWords } from "@/lib/text";
import { useExamSessionStore } from "@/stores/examSessionStore";
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
 * bloquante. À la confirmation : flush des réponses → remise définitive
 * côté serveur (clôture + correction + résultat, les clés ne descendent
 * jamais) → résultats. Une session expirée passe par le même chemin, avec le
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
      // 1. Persiste D'ABORD les dernières réponses : la correction serveur
      //    ne lit que les réponses en base. Un refus DÉFINITIF (temps écoulé,
      //    épreuve close) n'empêche pas la remise : on corrige ce qui est
      //    enregistré. Un échec passager, lui, l'empêche — remettre sans les
      //    dernières réponses ferait perdre des points au candidat.
      try {
        await sessionRepository.saveAnswers(sessionId, answers);
      } catch (cause) {
        if (!(cause instanceof SessionWriteError) || cause.retryable) {
          throw new Error(
            "Ihre letzten Antworten konnten nicht gespeichert werden. Bitte erneut versuchen.",
          );
        }
      }

      // 2. Remise définitive : clôture + correction + résultat, côté serveur.
      const response = await fetch(
        `/api/sessions/${encodeURIComponent(sessionId)}/submit`,
        { method: "POST" },
      );
      if (!response.ok) {
        const body = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "Die Abgabe ist fehlgeschlagen.");
      }

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
