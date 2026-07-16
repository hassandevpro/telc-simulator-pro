"use client";

import { useMemo } from "react";
import { countWords } from "@/lib/text";

export { countWords };

/** Compteur de mots mémoïsé pour l'éditeur Schreiben. */
export function useWordCount(text: string): number {
  return useMemo(() => countWords(text), [text]);
}
