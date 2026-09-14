"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Progression de la Vorbereitung, côté client.
 *
 * La Vorbereitung est ouverte à tous, y compris sans compte — la progression
 * doit donc survivre dans les deux cas :
 *   - visiteur anonyme : LocalStorage uniquement ;
 *   - candidat connecté : LocalStorage (instantané, hors ligne) + API (durable,
 *     synchronisé entre appareils). La base fait autorité au chargement.
 *
 * Même esprit que le repository de session (ARCHITECTURE.md §1.4) : l'appelant
 * ne sait pas où la donnée est rangée.
 */

const STORAGE_KEY = "telc:vorbereitung-progress";

/**
 * Champs tous optionnels : `save()` accepte une mise à jour PARTIELLE
 * (marquer « lu » sans toucher au score, enregistrer un score sans marquer
 * la leçon comme lue).
 */
export interface LessonProgressEntry {
  completed?: boolean;
  score?: number | null;
  maxScore?: number | null;
}

export type ProgressMap = Record<string, LessonProgressEntry>;

function readLocal(): ProgressMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ProgressMap) : {};
  } catch {
    // Mode privé, quota plein, JSON corrompu : on repart d'une progression
    // vide plutôt que de casser la page.
    return {};
  }
}

function writeLocal(map: ProgressMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Écriture impossible : la progression reste en mémoire pour la visite.
  }
}

export interface UseVorbereitungProgress {
  progress: ProgressMap;
  /** true tant que la fusion LocalStorage + API n'a pas eu lieu. */
  loading: boolean;
  save: (slug: string, entry: LessonProgressEntry) => void;
}

export function useVorbereitungProgress(
  authenticated: boolean,
  initial: ProgressMap = {},
): UseVorbereitungProgress {
  const [progress, setProgress] = useState<ProgressMap>(initial);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function hydrate() {
      const local = readLocal();
      // La base fait autorité : elle écrase l'entrée locale de même slug.
      let merged: ProgressMap = { ...local, ...initial };

      if (authenticated) {
        try {
          const response = await fetch("/api/vorbereitung/progress");
          if (response.ok) {
            const remote = (await response.json()) as ProgressMap;
            merged = { ...local, ...remote };
          }
        } catch {
          // Hors ligne : on garde la progression locale.
        }
      }

      if (cancelled) return;
      setProgress(merged);
      writeLocal(merged);
      setLoading(false);
    }

    void hydrate();
    return () => {
      cancelled = true;
    };
    // `initial` vient du serveur et ne change pas pendant la vie de la page.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticated]);

  const save = useCallback(
    (slug: string, entry: LessonProgressEntry) => {
      setProgress((current) => {
        const next = { ...current, [slug]: { ...current[slug], ...entry } };
        writeLocal(next);
        return next;
      });

      if (!authenticated) return;
      void fetch("/api/vorbereitung/progress", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonSlug: slug,
          ...(entry.completed === undefined
            ? {}
            : { completed: entry.completed }),
          ...(entry.score === undefined || entry.score === null
            ? {}
            : { score: entry.score, maxScore: entry.maxScore }),
        }),
        // Échec réseau : la progression locale est déjà écrite, la
        // prochaine action retentera la synchronisation.
      }).catch(() => undefined);
    },
    [authenticated],
  );

  return { progress, loading, save };
}
