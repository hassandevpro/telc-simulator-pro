import { getPart } from "@/config/exam-structure";
import type { ExamStructure } from "@/types/exam";
import type { ContentSource, GeneratedPart } from "../types";
import type { Rng } from "../rng";
import { letterIds } from "../ids";

const INSTRUCTIONS =
  "Lesen Sie den folgenden Text und schließen Sie die Lücken. Welches Wort " +
  "(a, b, c oder d) passt am besten? Nur eine Antwort ist richtig.";

/**
 * Sprachbausteine Teil 1 — CLOZE_DROPDOWN, 4 options par lacune.
 * Pour chaque lacune : mélange (bonne réponse + 3 distracteurs), attribue
 * a–d, fixe la clé. Le texte à trous (marqueurs {{n}}) est partagé.
 */
export async function generateSprachbausteineTeil1(
  structure: ExamStructure,
  source: ContentSource,
  rng: Rng,
): Promise<GeneratedPart> {
  const spec = getPart(structure, "sprachbausteine", "teil-1");
  if (!spec || spec.questionType !== "CLOZE_DROPDOWN") {
    throw new Error("Structure: sprachbausteine/teil-1 attendu en CLOZE_DROPDOWN.");
  }

  const material = await source.sprachbausteineTeil1(rng, { gaps: spec.itemCount });

  return {
    type: "CLOZE_DROPDOWN",
    shared: { instructions: INSTRUCTIONS, text: material.text },
    questions: material.gaps.map((gap, i) => {
      const shuffled = rng.shuffle([gap.correct, ...gap.distractors]);
      const ids = letterIds(shuffled.length); // a … d
      const options = shuffled.map((text, j) => ({ id: ids[j], text }));
      const answerKey = options.find((o) => o.text === gap.correct)!.id;
      return {
        position: i + 1,
        points: spec.pointsPerItem,
        answerKey,
        content: { gapIndex: i + 1, options },
      };
    }),
  };
}
