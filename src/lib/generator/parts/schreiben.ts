import { getPart } from "@/config/exam-structure";
import type { ExamStructure } from "@/types/exam";
import type {
  ContentSource,
  GeneratedPart,
  GeneratedSchreiben,
} from "../types";
import type { Rng } from "../rng";

const AUFGABEN = ["aufgabe-a", "aufgabe-b"] as const;

/**
 * Schreiben — deux Aufgaben WRITING TOTALEMENT différentes (sujets tirés
 * distincts de la banque). Chaque Aufgabe : consigne + quatre Leitpunkte +
 * nombre de mots minimal. Les modèles de production et les critères
 * d'évaluation sont renvoyés à part (corrigé) et n'entrent pas dans le
 * contenu servi au candidat.
 */
export async function generateSchreiben(
  structure: ExamStructure,
  source: ContentSource,
  rng: Rng,
): Promise<GeneratedSchreiben> {
  const tasks = await source.schreiben(rng, { count: AUFGABEN.length });

  const parts: Record<string, GeneratedPart> = {};
  const solutions = [];

  for (let i = 0; i < AUFGABEN.length; i += 1) {
    const partId = AUFGABEN[i];
    const spec = getPart(structure, "schreiben", partId);
    if (!spec || spec.questionType !== "WRITING") {
      throw new Error(`Structure: schreiben/${partId} attendu en WRITING.`);
    }
    const task = tasks[i];
    parts[`schreiben/${partId}`] = {
      type: "WRITING",
      shared: {},
      questions: [
        {
          position: 1,
          points: spec.pointsPerItem,
          answerKey: null, // correction manuelle (conforme au réel)
          content: {
            prompt: task.prompt,
            bulletPoints: task.bulletPoints,
            minWords: task.minWords,
          },
        },
      ],
    };
    solutions.push({
      partKey: `schreiben/${partId}`,
      modelAnswer: task.modelAnswer,
      criteria: task.criteria,
    });
  }

  return { parts, solutions };
}
