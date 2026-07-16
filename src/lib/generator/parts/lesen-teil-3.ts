import { getPart } from "@/config/exam-structure";
import type { ExamStructure } from "@/types/exam";
import type { ContentSource, GeneratedPart } from "../types";
import type { Rng } from "../rng";
import { letterIds } from "../ids";

const INSTRUCTIONS =
  "Lesen Sie die zehn Situationen und die zwölf Anzeigen A–L. Welche Anzeige " +
  "passt zu welcher Situation? Jede Anzeige können Sie nur einmal verwenden. " +
  "Gibt es zu einer Situation keine passende Anzeige, wählen Sie X.";

/**
 * Lesen Teil 3 — Zuordnung (AD_MATCHING).
 *   1. mélange les 12 annonces, attribue A–L, retient tag → lettre ;
 *   2. mélange l'ordre des 10 situations ;
 *   3. clé = lettre de l'annonce visée, ou "X" si aucune ne convient.
 * L'option « X » (allowNoAnswer) est gérée par le moteur de rendu/scoring —
 * on ne l'ajoute pas aux annonces, mais la clé peut valoir "X".
 */
export async function generateLesenTeil3(
  structure: ExamStructure,
  source: ContentSource,
  rng: Rng,
): Promise<GeneratedPart> {
  const spec = getPart(structure, "lesen", "teil-3");
  if (!spec || spec.questionType !== "AD_MATCHING") {
    throw new Error("Structure: lesen/teil-3 attendu en AD_MATCHING.");
  }
  const adCount = spec.optionCount ?? 12;

  const material = await source.lesenTeil3(rng, {
    ads: adCount,
    situations: spec.itemCount,
  });

  const shuffledAds = rng.shuffle(material.ads);
  const letters = letterIds(adCount, true); // A … L
  const tagToLetter = new Map(shuffledAds.map((ad, i) => [ad.tag, letters[i]]));

  const situations = rng.shuffle(material.situations);

  return {
    type: "AD_MATCHING",
    shared: {
      instructions: INSTRUCTIONS,
      ads: shuffledAds.map((ad, i) => ({ key: letters[i], text: ad.text })),
    },
    questions: situations.map((s, i) => ({
      position: i + 1,
      points: spec.pointsPerItem,
      answerKey: s.answer === "X" ? "X" : tagToLetter.get(s.answer)!,
      content: { situation: s.text },
    })),
  };
}
