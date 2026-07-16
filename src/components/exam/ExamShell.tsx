"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { EXAM_STRUCTURES } from "@/config/exam-structure";
import { useAutosave, type AutosaveStatus } from "@/hooks/useAutosave";
import { useBeforeUnload } from "@/hooks/useBeforeUnload";
import { sessionRepository } from "@/lib/repository";
import { createInitialSessionState } from "@/lib/session-factory";
import { useAudioStore } from "@/stores/audioStore";
import { useExamSessionStore } from "@/stores/examSessionStore";
import { useTimerStore } from "@/stores/timerStore";
import { ExamNav } from "./ExamNav";
import { GlobalTimer } from "./GlobalTimer";
import { LockOverlay } from "./LockOverlay";
import { PartNavigation } from "./PartNavigation";

export interface ExamShellProps {
  sessionId: string;
  children: ReactNode;
}

/**
 * Coquille du mode examen (ARCHITECTURE.md §2) :
 * en-tête sticky (nav 2 niveaux + timer + indicateur de sauvegarde) ·
 * zone de contenu · Zurück/Weiter. Aucun lien vers le reste du produit.
 *
 * Bootstrap de session (v1 LocalStorage-first) :
 *  1. charge la session depuis le SessionRepository ;
 *  2. absente → création : l'ancre `startedAt` est posée UNE fois pour
 *     toutes (Sprint 6 : elle sera posée à la validation du test audio) ;
 *  3. hydrate les trois stores depuis l'état persisté — le repository est
 *     la source de vérité, un refresh ne réinitialise jamais rien ;
 *  4. session déjà close (SUBMITTED/EXPIRED) → redirection vers la remise :
 *     rentrer à nouveau dans l'URL ne rouvre pas l'épreuve.
 */
export function ExamShell({ sessionId, children }: ExamShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const structure = EXAM_STRUCTURES.B2;

  const hydrate = useExamSessionStore((state) => state.hydrate);
  const setStatus = useExamSessionStore((state) => state.setStatus);
  const status = useExamSessionStore((state) => state.status);
  const hydratePlayed = useAudioStore((state) => state.hydratePlayed);
  const initializeTimer = useTimerStore((state) => state.initialize);

  const autosaveStatus = useAutosave(sessionId);
  useBeforeUnload(status === "IN_PROGRESS");

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      let persisted = await sessionRepository.load(sessionId);

      if (!persisted) {
        // La session naît en AUDIO_CHECK, sans ancre de timer : le
        // chronomètre ne démarre qu'à la validation du test casque.
        persisted = createInitialSessionState(sessionId, structure);
        await sessionRepository.save(persisted);
      }

      if (cancelled) return;

      hydrate(persisted);
      hydratePlayed(persisted.playedAudioIds);
      if (persisted.startedAt !== null) {
        initializeTimer(
          sessionId,
          persisted.startedAt,
          persisted.durationSeconds,
        );
      }

      // Test casque non validé : on n'entre pas dans l'épreuve.
      if (persisted.status === "AUDIO_CHECK") {
        router.replace(`/audio-check?session=${sessionId}`);
        return;
      }

      // Session close : on ne rouvre jamais l'épreuve.
      if (
        (persisted.status === "SUBMITTED" || persisted.status === "EXPIRED") &&
        !pathname.endsWith("/abgabe")
      ) {
        router.replace(`/session/${sessionId}/abgabe`);
      }
    };

    void bootstrap();
    return () => {
      cancelled = true;
    };
    // pathname volontairement absent des dépendances : le bootstrap ne doit
    // tourner qu'une fois par session, pas à chaque navigation interne.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, hydrate, hydratePlayed, initializeTimer, router, structure]);

  const handleExpire = () => {
    // Temps écoulé : la session est close, comme au centre d'examen.
    // La revalidation serveur des délais arrive au Sprint 8.
    setStatus("EXPIRED");
    void sessionRepository.setStatus(sessionId, "EXPIRED");
    router.replace(`/session/${sessionId}/abgabe`);
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="relative sticky top-0 z-40 border-b border-border bg-background">
        <LockOverlay />
        <div className="flex items-center justify-between">
          <ExamNav sessionId={sessionId} structure={structure} />
          <div className="flex items-center gap-3">
            <SaveIndicator status={autosaveStatus} />
            <GlobalTimer onExpire={handleExpire} />
          </div>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <PartNavigation sessionId={sessionId} structure={structure} />
    </div>
  );
}

/**
 * Indicateur discret de sauvegarde, près du timer (ARCHITECTURE.md §6).
 * Largeur réservée : l'en-tête ne bouge pas quand le libellé change.
 */
function SaveIndicator({ status }: { status: AutosaveStatus }) {
  const label =
    status === "pending"
      ? "Speichern…"
      : status === "saved"
        ? "Gespeichert"
        : status === "error"
          ? "Speicherfehler"
          : "";

  return (
    <span
      aria-live="polite"
      className={
        "min-w-24 text-right text-[11px] " +
        (status === "error" ? "text-danger" : "text-muted")
      }
    >
      {label}
    </span>
  );
}
