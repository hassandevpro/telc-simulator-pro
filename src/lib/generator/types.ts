import type { Level } from "@/types/exam";
import type { PartContentPayload } from "@/lib/validators";
import type { Rng } from "./rng";

/**
 * Sortie du générateur pour UN Teil : exactement le payload que la route
 * admin PUT sait valider (lib/validators.partContentPayloadSchema) et écrire
 * en base. Le générateur ne produit jamais une autre forme — un Teil généré
 * est indiscernable d'un Teil saisi à la main dans l'admin.
 */
export type GeneratedPart = PartContentPayload;

/**
 * Script audio d'un Teil Hören — matière première pour la synthèse vocale
 * (ElevenLabs). Le champ `text` est le script parlé ; `voice` / `speed` /
 * `pauses` pilotent le rendu. Produit en même temps que le contenu des
 * questions pour garantir que questions et audio parlent du même sujet.
 */
export interface HoerenScript {
  /** Clé "hoeren/teil-1" … du Teil auquel l'audio se rattache. */
  partKey: string;
  /** Texte parlé, balises de pause « ... » incluses. */
  text: string;
  /** Locuteurs, pour une future synthèse multi-voix. */
  speakers: string[];
  /** Durée cible en secondes (indicatif pour la synthèse). */
  targetSeconds: number;
}

/** Un examen entièrement généré, prêt à valider puis à persister. */
export interface GeneratedExam {
  seed: string;
  title: string;
  level: Level;
  /** Payloads indexés par "sectionId/partId" (ex. "lesen/teil-1"). */
  parts: Record<string, GeneratedPart>;
  /** Scripts audio des trois Teile Hören. */
  hoerenScripts: HoerenScript[];
  /** Modèles + critères du Schreiben (corrigé, hors client). */
  writingSolutions: WritingSolution[];
}

/**
 * SEAM hybride. Une source fournit la MATIÈRE PREMIÈRE (textes, distracteurs,
 * items de vocabulaire…) ; le moteur (parts/*) fait l'ASSEMBLAGE identique
 * quelle que soit l'origine : tirage, attribution des id a–j / A–L, calcul
 * des clés de correction, mélange des distracteurs.
 *
 * - `BankSource` puise dans une banque de contenus originaux écrits à la main.
 * - Un futur `AiSource` interrogera l'API Claude et renverra la MÊME forme —
 *   sans toucher au moteur ni aux validateurs.
 *
 * Chaque méthode reçoit le `Rng` pour un tirage reproductible et déclare la
 * quantité de matière voulue.
 */
export interface ContentSource {
  /** Textes courts + titres corrects + titres distracteurs (Lesen Teil 1). */
  lesenTeil1(
    rng: Rng,
    need: { texts: number; distractorTitles: number },
  ): Promise<LesenTeil1Material> | LesenTeil1Material;
  /** Texte source + questions à choix (Lesen Teil 2). */
  lesenTeil2(
    rng: Rng,
    need: { questions: number },
  ): Promise<LesenTeil2Material> | LesenTeil2Material;
  /** Annonces + situations à apparier (Lesen Teil 3). */
  lesenTeil3(
    rng: Rng,
    need: { ads: number; situations: number },
  ): Promise<AdMatchingMaterial> | AdMatchingMaterial;
  /** Texte à trous + options par lacune (Sprachbausteine Teil 1). */
  sprachbausteineTeil1(
    rng: Rng,
    need: { gaps: number },
  ): Promise<SbTeil1Material> | SbTeil1Material;
  /** Texte à trous + banque de mots (Sprachbausteine Teil 2). */
  sprachbausteineTeil2(
    rng: Rng,
    need: { gaps: number; bankSize: number },
  ): Promise<SbTeil2Material> | SbTeil2Material;
  /** Dialogue + QCM (Hören Teil 1). */
  hoerenTeil1(
    rng: Rng,
    need: { questions: number },
  ): Promise<HoerenMcMaterial> | HoerenMcMaterial;
  /** Interview + Richtig/Falsch (Hören Teil 2). */
  hoerenTeil2(
    rng: Rng,
    need: { statements: number },
  ): Promise<HoerenTfMaterial> | HoerenTfMaterial;
  /** Ansagen + QCM (Hören Teil 3). */
  hoerenTeil3(
    rng: Rng,
    need: { questions: number },
  ): Promise<HoerenMcMaterial> | HoerenMcMaterial;
  /** `count` sujets Schreiben DISTINCTS (Aufgabe A / B). */
  schreiben(
    rng: Rng,
    need: { count: number },
  ): Promise<SchreibenTask[]> | SchreibenTask[];
}

/** Un texte court avec son titre correct (Lesen Teil 1). */
export interface TitledText {
  theme: string;
  title: string;
  text: string;
}

export interface LesenTeil1Material {
  texts: TitledText[];
  distractorTitles: string[];
}

/** Une question à choix avant assemblage : bonne réponse + distracteurs. */
export interface McSeed {
  prompt: string;
  correct: string;
  distractors: string[];
}

export interface LesenTeil2Material {
  sourceText: string;
  questions: McSeed[];
}

/** Matière Lesen Teil 3 : annonces étiquetées + situations à apparier. */
export interface AdMatchingMaterial {
  ads: { tag: string; text: string }[];
  /** `answer` : tag d'une annonce, ou "X" (aucune annonce adéquate). */
  situations: { text: string; answer: string }[];
}

/** Une lacune Sprachbausteine T1 : réponse correcte + distracteurs. */
export interface ClozeGap {
  correct: string;
  distractors: string[];
}

/** Matière Sprachbausteine Teil 1 : texte à trous + options par lacune. */
export interface SbTeil1Material {
  text: string;
  gaps: ClozeGap[];
}

/** Matière Sprachbausteine Teil 2 : texte + solutions ordonnées + intrus. */
export interface SbTeil2Material {
  text: string;
  solutions: string[];
  distractorWords: string[];
}

/** Script parlé brut (matière audio) partagé par les Teile Hören. */
export interface HoerenScriptMaterial {
  text: string;
  speakers: string[];
  targetSeconds: number;
}

/** Matière Hören QCM (Teil 1 & 3) : script + questions à choix. */
export interface HoerenMcMaterial {
  script: HoerenScriptMaterial;
  questions: McSeed[];
}

/** Matière Hören Richtig/Falsch (Teil 2) : script + affirmations. */
export interface HoerenTfMaterial {
  script: HoerenScriptMaterial;
  statements: { text: string; correct: "richtig" | "falsch" }[];
}

/** Sortie d'un Teil Hören : le contenu ET son script audio. */
export interface GeneratedHoerenPart {
  part: GeneratedPart;
  script: HoerenScript;
}

/** Un sujet Schreiben, modèle et critères inclus (pour le corrigé). */
export interface SchreibenTask {
  prompt: string;
  bulletPoints: string[];
  minWords: number;
  modelAnswer: string;
  criteria: string[];
}

/** Modèle de production d'un Teil Schreiben (pour le corrigé, hors client). */
export interface WritingSolution {
  partKey: string;
  modelAnswer: string;
  criteria: string[];
}

/** Sortie du Schreiben : deux Aufgaben + leurs modèles. */
export interface GeneratedSchreiben {
  parts: Record<string, GeneratedPart>;
  solutions: WritingSolution[];
}

/** Options de génération d'un examen complet. */
export interface GenerateExamOptions {
  /** Graine reproductible. Absente → graine aléatoire horodatée. */
  seed?: string;
  level?: Level;
  /** Titre affiché ; défaut « telc Deutsch B2 — Testsatz {seed} ». */
  title?: string;
  /** Source de matière ; défaut = banque intégrée. */
  source?: ContentSource;
}
