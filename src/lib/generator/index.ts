import { getStructureForLevel } from "@/config/exam-structure";
import type { Level } from "@/types/exam";
import { createRng } from "./rng";
import { bankSource } from "./source-bank";
import type { GenerateExamOptions, GeneratedExam, HoerenScript } from "./types";
import { generateLesenTeil1 } from "./parts/lesen-teil-1";
import { generateLesenTeil2 } from "./parts/lesen-teil-2";
import { generateLesenTeil3 } from "./parts/lesen-teil-3";
import { generateSprachbausteineTeil1 } from "./parts/sprachbausteine-teil-1";
import { generateSprachbausteineTeil2 } from "./parts/sprachbausteine-teil-2";
import {
  generateHoerenTeil1,
  generateHoerenTeil2,
  generateHoerenTeil3,
} from "./parts/hoeren";
import { generateSchreiben } from "./parts/schreiben";

/**
 * POINT D'ENTRÉE du générateur. Assemble un examen telc complet et INÉDIT à
 * partir d'une graine : Lesen (3 Teile), Sprachbausteine (2), Hören (3 +
 * scripts audio) et Schreiben (2 Aufgaben + modèles). Chaque Teil sort sous
 * la forme exacte que la route admin sait valider et persister.
 *
 * Reproductible : même `seed` ⇒ même examen. Sans `seed`, une graine
 * horodatée aléatoire est tirée (retournée dans le résultat).
 */
export async function generateExam(
  options: GenerateExamOptions = {},
): Promise<GeneratedExam> {
  const level: Level = options.level ?? "B2";
  const seed = options.seed ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  const structure = getStructureForLevel(level);
  const source = options.source ?? bankSource;
  const rng = createRng(seed);

  const parts: GeneratedExam["parts"] = {};
  const hoerenScripts: HoerenScript[] = [];

  // Lesen
  parts["lesen/teil-1"] = await generateLesenTeil1(structure, source, rng);
  parts["lesen/teil-2"] = await generateLesenTeil2(structure, source, rng);
  parts["lesen/teil-3"] = await generateLesenTeil3(structure, source, rng);

  // Sprachbausteine
  parts["sprachbausteine/teil-1"] = await generateSprachbausteineTeil1(structure, source, rng);
  parts["sprachbausteine/teil-2"] = await generateSprachbausteineTeil2(structure, source, rng);

  // Hören (contenu + script)
  for (const gen of [
    await generateHoerenTeil1(structure, source, rng),
    await generateHoerenTeil2(structure, source, rng),
    await generateHoerenTeil3(structure, source, rng),
  ]) {
    hoerenScripts.push(gen.script);
    parts[gen.script.partKey] = gen.part;
  }

  // Schreiben (deux Aufgaben + modèles pour le corrigé)
  const schreiben = await generateSchreiben(structure, source, rng);
  Object.assign(parts, schreiben.parts);

  return {
    seed,
    title: options.title ?? `telc Deutsch ${level} — Testsatz ${seed}`,
    level,
    parts,
    hoerenScripts,
    writingSolutions: schreiben.solutions,
  };
}

export { validateExam, validatePart } from "./validate";
export { bankSource } from "./source-bank";
export type { GeneratedExam, GeneratedPart, HoerenScript } from "./types";
