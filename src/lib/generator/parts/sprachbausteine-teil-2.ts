import { getPart } from "@/config/exam-structure";
import type { ExamStructure } from "@/types/exam";
import type { ContentSource, GeneratedPart } from "../types";
import type { Rng } from "../rng";
import { letterIds } from "../ids";

const INSTRUCTIONS =
  "Lesen Sie den Text und schließen Sie die Lücken. Wählen Sie für jede Lücke " +
  "das passende Wort aus der Liste A–O. Jedes Wort können Sie nur einmal " +
  "verwenden. Nicht alle Wörter passen.";

/**
 * Sprachbausteine Teil 2 — CLOZE_DROPDOWN avec banque de mots partagée.
 * Mélange les 15 mots (10 solutions + 5 distracteurs), attribue A–O, puis
 * fixe la clé de chaque lacune sur la lettre du mot correct. Les options par
 * lacune restent vides : le rendu propose la banque entière (fidélité telc).
 */
export async function generateSprachbausteineTeil2(
  structure: ExamStructure,
  source: ContentSource,
  rng: Rng,
): Promise<GeneratedPart> {
  const spec = getPart(structure, "sprachbausteine", "teil-2");
  if (!spec || spec.questionType !== "CLOZE_DROPDOWN") {
    throw new Error("Structure: sprachbausteine/teil-2 attendu en CLOZE_DROPDOWN.");
  }
  const bankSize = spec.optionCount ?? 15;

  const material = await source.sprachbausteineTeil2(rng, {
    gaps: spec.itemCount,
    bankSize,
  });

  const words = rng.shuffle([...material.solutions, ...material.distractorWords]);
  const letters = letterIds(bankSize, true); // A … O
  const wordToLetter = new Map(words.map((w, i) => [w, letters[i]]));

  return {
    type: "CLOZE_DROPDOWN",
    shared: {
      instructions: INSTRUCTIONS,
      text: material.text,
      wordBank: words.map((text, i) => ({ id: letters[i], text })),
    },
    questions: material.solutions.map((word, i) => ({
      position: i + 1,
      points: spec.pointsPerItem,
      answerKey: wordToLetter.get(word)!,
      content: { gapIndex: i + 1, options: [] },
    })),
  };
}
