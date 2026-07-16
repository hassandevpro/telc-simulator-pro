/**
 * Types du domaine — structure d'un examen telc.
 * La STRUCTURE officielle (sections, Teile, barème) est une constante
 * définie dans src/config/exam-structure.ts. Le CONTENU (textes, questions,
 * audios) est de la donnée en base (voir prisma/schema.prisma).
 */

export type Level = "B1" | "B2";

export type SectionId = "lesen" | "hoeren" | "sprachbausteine" | "schreiben";

/**
 * Les 5 types de questions du simulateur (ARCHITECTURE.md §2).
 * Un composant de rendu par type — jamais par Teil.
 */
export type QuestionType =
  | "TITLE_MATCHING" // Lesen Teil 1 : 5 textes / 10 titres
  | "MULTIPLE_CHOICE" // Lesen Teil 2, Hören Teil 1–3, Sprachbausteine Teil 2
  | "AD_MATCHING" // Lesen Teil 3 : situations → annonces A–L + X
  | "CLOZE_DROPDOWN" // Sprachbausteine Teil 1 : menus dans le texte
  | "WRITING"; // Schreiben Aufgabe A / B

export interface PartStructure {
  /** Identifiant d'URL : "teil-1", "aufgabe-a"… */
  id: string;
  /** Libellé officiel affiché dans la navigation : "Teil 1", "Aufgabe A"… */
  label: string;
  questionType: QuestionType;
  /** Nombre d'items à répondre dans ce Teil. */
  itemCount: number;
  /** Nombre d'options proposées (titres, annonces…), si différent d'un QCM simple. */
  optionCount?: number;
  /** Lesen Teil 3 : l'option « X » (aucune annonce adéquate) est disponible. */
  allowNoAnswer?: boolean;
  pointsPerItem: number;
}

export interface SectionStructure {
  id: SectionId;
  label: string;
  parts: PartStructure[];
}

export interface ExamStructure {
  level: Level;
  schriftlichePruefung: {
    /** Durée totale de l'épreuve écrite, en minutes. */
    durationMinutes: number;
    sections: SectionStructure[];
  };
}
