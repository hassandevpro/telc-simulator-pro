/**
 * Types du contenu pédagogique de la Vorbereitung.
 *
 * Principe (ARCHITECTURE.md §1.2) : le contenu est de la DONNÉE, jamais du
 * JSX. Les leçons vivent dans des modules TypeScript typés (`lessons/*.ts`),
 * les composants ne font que les rendre. Conséquence : ajouter une leçon =
 * ajouter un objet, zéro nouveau composant.
 *
 * La PROGRESSION de l'utilisateur, elle, vit en base (model LessonProgress) —
 * c'est la partie « hybride » : contenu statique, progression dynamique.
 */

import type { Level } from "@/types/exam";

/** Les trois familles de la Vorbereitung (onglets de la page d'accueil). */
export type TrackId = "pruefungsteile" | "grammatik" | "redemittel";

export interface TrackDefinition {
  id: TrackId;
  label: string;
  description: string;
}

/* ---------- Blocs de contenu d'une leçon ---------- */

/**
 * Un bloc = une unité de rendu. Union discriminée par `kind` : le composant
 * `LessonBlocks` dispatche dessus, exactement comme `QuestionRenderer` le
 * fait pour les types de questions.
 */
export type LessonBlock =
  /** Paragraphes séparés par une ligne vide. */
  | { kind: "text"; body: string }
  /** Liste à puces, avec titre optionnel. */
  | { kind: "list"; title?: string; items: string[] }
  /** Tableau (déclinaisons, connecteurs, temps…). */
  | { kind: "table"; head: string[]; rows: string[][] }
  /** Exemples en allemand, avec glose/remarque facultative. */
  | { kind: "examples"; items: { de: string; note?: string }[] }
  /** Encadré « Tipp » — conseil de stratégie. */
  | { kind: "tip"; body: string }
  /** Encadré « Typischer Fehler » — erreur fréquente à éviter. */
  | { kind: "pitfall"; body: string };

export interface LessonSection {
  id: string;
  title: string;
  blocks: LessonBlock[];
}

/* ---------- Exercices ---------- */

/**
 * QCM d'entraînement. Même forme que `MultipleChoiceContent`
 * (src/types/question-content.ts), enrichie de la correction et de
 * l'explication : en Vorbereitung la clé est publique — c'est de
 * l'entraînement, pas un examen (où l'answerKey ne quitte jamais le serveur).
 */
export interface ChoiceExercise {
  id: string;
  kind: "choice";
  question: string;
  options: { id: string; text: string }[];
  /** Id de l'option correcte. */
  answer: string;
  explanation: string;
}

/**
 * Texte à trous à menus déroulants — le format Sprachbausteine Teil 1.
 * Les lacunes sont notées `{{1}}`, `{{2}}`… dans `text`.
 */
export interface ClozeExercise {
  id: string;
  kind: "cloze";
  /** Consigne courte affichée au-dessus du texte. */
  question: string;
  text: string;
  gaps: {
    index: number;
    options: { id: string; text: string }[];
    answer: string;
    explanation: string;
  }[];
}

export type Exercise = ChoiceExercise | ClozeExercise;

/** Nombre d'items corrigibles d'un exercice (1 par QCM, n par lacune). */
export function exerciseItemCount(exercise: Exercise): number {
  return exercise.kind === "choice" ? 1 : exercise.gaps.length;
}

/* ---------- Leçon ---------- */

export interface Lesson {
  /** Identifiant d'URL — /vorbereitung/<slug>. Stable : il sert de clé de progression en base. */
  slug: string;
  track: TrackId;
  title: string;
  /** Sous-titre d'une ligne, affiché sur la carte du catalogue. */
  subtitle: string;
  /** Niveaux concernés. Une leçon peut servir les deux (`["B1", "B2"]`). */
  levels: Level[];
  /** Durée de lecture estimée, en minutes. */
  minutes: number;
  sections: LessonSection[];
  exercises: Exercise[];
}

/** Total d'items corrigibles d'une leçon — dénominateur du score affiché. */
export function lessonMaxScore(lesson: Lesson): number {
  return lesson.exercises.reduce((total, ex) => total + exerciseItemCount(ex), 0);
}
