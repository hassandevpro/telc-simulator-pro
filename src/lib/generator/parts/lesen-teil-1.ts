import { getPart } from "@/config/exam-structure";
import type { ExamStructure } from "@/types/exam";
import type { ContentSource, GeneratedPart } from "../types";
import type { Rng } from "../rng";
import { letterIds } from "../ids";

const INSTRUCTIONS =
  "Lesen Sie zuerst die Überschriften a–j. Lesen Sie dann die fünf Texte und " +
  "entscheiden Sie, welche Überschrift am besten zu welchem Text passt. Jede " +
  "Überschrift können Sie nur einmal verwenden. Nicht alle Überschriften passen.";

/**
 * Lesen Teil 1 — Überschriften zuordnen (TITLE_MATCHING).
 * Assemblage PUR : matière (source) → payload validable par le PUT admin.
 *   1. tire `itemCount` textes + (`optionCount` − `itemCount`) distracteurs ;
 *   2. mélange les titres corrects et distracteurs, attribue a–j ;
 *   3. calcule la clé de correction de chaque texte = id de son titre.
 * Toutes les quantités (5 textes, 10 titres, 5 pts) viennent de la structure
 * officielle (config/exam-structure.ts) — jamais codées en dur ici.
 */
export async function generateLesenTeil1(
  structure: ExamStructure,
  source: ContentSource,
  rng: Rng,
): Promise<GeneratedPart> {
  const spec = getPart(structure, "lesen", "teil-1");
  if (!spec || spec.questionType !== "TITLE_MATCHING") {
    throw new Error("Structure: lesen/teil-1 attendu en TITLE_MATCHING.");
  }
  const itemCount = spec.itemCount;
  const optionCount = spec.optionCount ?? itemCount * 2;
  const distractorCount = optionCount - itemCount;

  const material = await source.lesenTeil1(rng, {
    texts: itemCount,
    distractorTitles: distractorCount,
  });

  // Chaque titre reçoit un id a–j après mélange ; on retient quel titre
  // correspond à quel texte pour en déduire la clé.
  const correct = material.texts.map((t) => ({ title: t.title, text: t.text }));
  const shuffledTitles = rng.shuffle([
    ...correct.map((c) => c.title),
    ...material.distractorTitles,
  ]);
  const ids = letterIds(optionCount); // a … j
  const titleToId = new Map(shuffledTitles.map((title, i) => [title, ids[i]]));

  return {
    type: "TITLE_MATCHING",
    shared: {
      instructions: INSTRUCTIONS,
      titles: shuffledTitles.map((text, i) => ({ id: ids[i], text })),
    },
    questions: correct.map((c, i) => ({
      position: i + 1,
      points: spec.pointsPerItem,
      answerKey: titleToId.get(c.title)!,
      content: { text: c.text },
    })),
  };
}
