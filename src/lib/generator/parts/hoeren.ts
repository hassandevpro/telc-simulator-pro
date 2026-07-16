import { getPart } from "@/config/exam-structure";
import type { ExamStructure } from "@/types/exam";
import type {
  ContentSource,
  GeneratedHoerenPart,
  GeneratedPart,
  HoerenMcMaterial,
  HoerenScript,
} from "../types";
import type { Rng } from "../rng";
import { letterIds } from "../ids";

const INSTR_T1 =
  "Sie hören ein Gespräch. Zu jedem Punkt gibt es eine Aufgabe. Wählen Sie " +
  "die richtige Antwort a, b oder c. Sie hören das Gespräch nur einmal.";
const INSTR_T2 =
  "Sie hören ein Interview. Entscheiden Sie bei jeder Aussage, ob sie richtig " +
  "oder falsch ist. Sie hören das Interview nur einmal.";
const INSTR_T3 =
  "Sie hören fünf kurze Ansagen. Wählen Sie zu jeder Ansage die richtige " +
  "Antwort a, b oder c. Sie hören jede Ansage nur einmal.";

/** Assemble un Teil Hören QCM (Teil 1 ou 3) + son script. */
function buildMcPart(
  partKey: string,
  instructions: string,
  pointsPerItem: number,
  material: HoerenMcMaterial,
  rng: Rng,
): GeneratedHoerenPart {
  const part: GeneratedPart = {
    type: "MULTIPLE_CHOICE",
    shared: { instructions }, // pas de sourceText : le support est l'audio
    questions: material.questions.map((q, i) => {
      const shuffled = rng.shuffle([q.correct, ...q.distractors]);
      const ids = letterIds(shuffled.length);
      const options = shuffled.map((text, j) => ({ id: ids[j], text }));
      return {
        position: i + 1,
        points: pointsPerItem,
        answerKey: options.find((o) => o.text === q.correct)!.id,
        content: { question: q.prompt, options },
      };
    }),
  };
  const script: HoerenScript = {
    partKey,
    text: material.script.text,
    speakers: material.script.speakers,
    targetSeconds: material.script.targetSeconds,
  };
  return { part, script };
}

/** Hören Teil 1 — längeres Gespräch (QCM). */
export async function generateHoerenTeil1(
  structure: ExamStructure,
  source: ContentSource,
  rng: Rng,
): Promise<GeneratedHoerenPart> {
  const spec = getPart(structure, "hoeren", "teil-1");
  if (!spec) throw new Error("Structure: hoeren/teil-1 introuvable.");
  const material = await source.hoerenTeil1(rng, { questions: spec.itemCount });
  return buildMcPart("hoeren/teil-1", INSTR_T1, spec.pointsPerItem, material, rng);
}

/** Hören Teil 3 — Ansagen (QCM). */
export async function generateHoerenTeil3(
  structure: ExamStructure,
  source: ContentSource,
  rng: Rng,
): Promise<GeneratedHoerenPart> {
  const spec = getPart(structure, "hoeren", "teil-3");
  if (!spec) throw new Error("Structure: hoeren/teil-3 introuvable.");
  const material = await source.hoerenTeil3(rng, { questions: spec.itemCount });
  return buildMcPart("hoeren/teil-3", INSTR_T3, spec.pointsPerItem, material, rng);
}

/** Hören Teil 2 — Interview (Richtig/Falsch, deux options fixes). */
export async function generateHoerenTeil2(
  structure: ExamStructure,
  source: ContentSource,
  rng: Rng,
): Promise<GeneratedHoerenPart> {
  const spec = getPart(structure, "hoeren", "teil-2");
  if (!spec) throw new Error("Structure: hoeren/teil-2 introuvable.");
  const material = await source.hoerenTeil2(rng, { statements: spec.itemCount });

  const part: GeneratedPart = {
    type: "MULTIPLE_CHOICE",
    shared: { instructions: INSTR_T2 },
    questions: material.statements.map((s, i) => ({
      position: i + 1,
      points: spec.pointsPerItem,
      // Ordre fixe Richtig=a / Falsch=b (convention telc pour ce format).
      answerKey: s.correct === "richtig" ? "a" : "b",
      content: {
        question: s.text,
        options: [
          { id: "a", text: "Richtig" },
          { id: "b", text: "Falsch" },
        ],
      },
    })),
  };
  const script: HoerenScript = {
    partKey: "hoeren/teil-2",
    text: material.script.text,
    speakers: material.script.speakers,
    targetSeconds: material.script.targetSeconds,
  };
  return { part, script };
}
