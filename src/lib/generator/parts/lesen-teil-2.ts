import { getPart } from "@/config/exam-structure";
import type { ExamStructure } from "@/types/exam";
import type { ContentSource, GeneratedPart } from "../types";
import type { Rng } from "../rng";
import { letterIds } from "../ids";

const INSTRUCTIONS =
  "Lesen Sie zuerst den Text und dann die Aufgaben. Wählen Sie bei jeder " +
  "Aufgabe die richtige Antwort a, b oder c. Nur eine Antwort ist richtig.";

/**
 * Lesen Teil 2 — Detailverstehen (MULTIPLE_CHOICE).
 * Pour chaque question, mélange les trois options (bonne réponse + deux
 * distracteurs), attribue a/b/c et fixe la clé sur l'id de la bonne réponse.
 * Le mélange évite tout biais de position (jamais toujours « a »).
 */
export async function generateLesenTeil2(
  structure: ExamStructure,
  source: ContentSource,
  rng: Rng,
): Promise<GeneratedPart> {
  const spec = getPart(structure, "lesen", "teil-2");
  if (!spec || spec.questionType !== "MULTIPLE_CHOICE") {
    throw new Error("Structure: lesen/teil-2 attendu en MULTIPLE_CHOICE.");
  }

  const material = await source.lesenTeil2(rng, { questions: spec.itemCount });

  return {
    type: "MULTIPLE_CHOICE",
    shared: { instructions: INSTRUCTIONS, sourceText: material.sourceText },
    questions: material.questions.map((q, i) => {
      const shuffled = rng.shuffle([q.correct, ...q.distractors]);
      const ids = letterIds(shuffled.length); // a, b, c
      const options = shuffled.map((text, j) => ({ id: ids[j], text }));
      const answerKey = options.find((o) => o.text === q.correct)!.id;
      return {
        position: i + 1,
        points: spec.pointsPerItem,
        answerKey,
        content: { question: q.prompt, options },
      };
    }),
  };
}
