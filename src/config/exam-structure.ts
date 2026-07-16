import type { ExamStructure, Level, PartStructure, SectionId } from "@/types/exam";

/**
 * SOURCE DE VÉRITÉ de la structure officielle telc B2 (épreuve écrite).
 * La navigation, le rendu, le scoring et l'admin lisent tous cet objet.
 * Ajouter le B1 = ajouter un objet TELC_B1 ici — zéro nouveau composant.
 *
 * Barème indicatif conforme au format telc Deutsch B2 :
 *   Leseverstehen 75 pts · Sprachbausteine 30 pts · Hörverstehen 75 pts ·
 *   Schriftlicher Ausdruck 45 pts — total écrit 225 pts.
 * Vérification finale contre les documents officiels au module Scoring (Sprint 8).
 */
export const TELC_B2: ExamStructure = {
  level: "B2",
  schriftlichePruefung: {
    // Lesen + Sprachbausteine : 90 min · Hören : ~20 min · Schreiben : 30 min
    durationMinutes: 140,
    sections: [
      {
        id: "lesen",
        label: "Lesen",
        parts: [
          {
            id: "teil-1",
            label: "Teil 1",
            questionType: "TITLE_MATCHING",
            itemCount: 5, // 5 textes
            optionCount: 10, // 10 titres proposés (5 distracteurs)
            pointsPerItem: 5,
          },
          {
            id: "teil-2",
            label: "Teil 2",
            questionType: "MULTIPLE_CHOICE",
            itemCount: 5,
            pointsPerItem: 5,
          },
          {
            id: "teil-3",
            label: "Teil 3",
            questionType: "AD_MATCHING",
            itemCount: 10, // 10 situations
            optionCount: 12, // annonces A–L
            allowNoAnswer: true, // + option « X » : aucune annonce adéquate
            pointsPerItem: 2.5,
          },
        ],
      },
      {
        id: "sprachbausteine",
        label: "Sprachbausteine",
        parts: [
          {
            id: "teil-1",
            label: "Teil 1",
            questionType: "CLOZE_DROPDOWN",
            itemCount: 10,
            pointsPerItem: 1.5,
          },
          {
            id: "teil-2",
            label: "Teil 2",
            // Fidélité telc : texte à trous avec banque de 15 mots (A–O)
            // communs à toutes les lacunes — même moteur que le Teil 1.
            questionType: "CLOZE_DROPDOWN",
            itemCount: 10,
            optionCount: 15,
            pointsPerItem: 1.5,
          },
        ],
      },
      {
        id: "hoeren",
        label: "Hören",
        parts: [
          {
            id: "teil-1",
            label: "Teil 1",
            questionType: "MULTIPLE_CHOICE",
            itemCount: 5,
            pointsPerItem: 3.75,
          },
          {
            id: "teil-2",
            label: "Teil 2",
            questionType: "MULTIPLE_CHOICE",
            itemCount: 10,
            pointsPerItem: 3.75,
          },
          {
            id: "teil-3",
            label: "Teil 3",
            questionType: "MULTIPLE_CHOICE",
            itemCount: 5,
            pointsPerItem: 3.75,
          },
        ],
      },
      {
        id: "schreiben",
        label: "Schreiben",
        parts: [
          // À l'examen réel, le candidat choisit UNE des deux Aufgaben.
          // Les deux sont visibles (spécification produit) ; le scoring
          // ne comptera qu'une seule production (Sprint 8).
          {
            id: "aufgabe-a",
            label: "Aufgabe A",
            questionType: "WRITING",
            itemCount: 1,
            pointsPerItem: 45,
          },
          {
            id: "aufgabe-b",
            label: "Aufgabe B",
            questionType: "WRITING",
            itemCount: 1,
            pointsPerItem: 45,
          },
        ],
      },
    ],
  },
};

/** Structures disponibles, indexées par niveau. */
export const EXAM_STRUCTURES = {
  B2: TELC_B2,
} as const;

/* ---------- Helpers de lecture (pure config, aucune logique métier) ---------- */

export function getSection(structure: ExamStructure, sectionId: SectionId) {
  return structure.schriftlichePruefung.sections.find(
    (s) => s.id === sectionId,
  );
}

export function getPart(
  structure: ExamStructure,
  sectionId: SectionId,
  partId: string,
): PartStructure | undefined {
  return getSection(structure, sectionId)?.parts.find((p) => p.id === partId);
}

/**
 * Numéro du premier item d'un Teil dans la numérotation OFFICIELLE continue
 * de l'épreuve écrite telc (Lesen 1–20, Sprachbausteine 21–40, Hören 41–60).
 * Le Schreiben n'est pas numéroté.
 */
export function getItemStartNumber(
  structure: ExamStructure,
  sectionId: SectionId,
  partId: string,
): number {
  let n = 1;
  for (const section of structure.schriftlichePruefung.sections) {
    for (const part of section.parts) {
      if (section.id === sectionId && part.id === partId) return n;
      if (part.questionType !== "WRITING") n += part.itemCount;
    }
  }
  return n;
}

/**
 * Structure pour un niveau donné. Le B1 n'est pas encore décrit :
 * il retombe sur la structure B2 (à remplacer à l'ajout du TELC_B1).
 */
export function getStructureForLevel(level: Level): ExamStructure {
  return EXAM_STRUCTURES[level as keyof typeof EXAM_STRUCTURES] ?? TELC_B2;
}
