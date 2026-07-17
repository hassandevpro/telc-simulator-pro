/**
 * Formes du champ JSON `content` (par question) et `sharedContent` (par Teil)
 * stockés en base — voir prisma/schema.prisma.
 * Types discriminés par QuestionType. La validation runtime (Zod) vit dans
 * src/lib/validators et sera branchée avec les formulaires admin (Sprint 10).
 */

/** Script parlé d'un Teil Hören (transcription pour produire/uploader l'audio). */
export interface HoerenScriptContent {
  text: string;
  speakers: string[];
  targetSeconds?: number;
}

/** Champs communs au contenu partagé d'un Teil. */
export interface SharedBase {
  /** Arbeitsanweisung officielle affichée en tête du Teil. */
  instructions?: string;
  /** Audio du Teil (Hören) — miroir de ExamPart.audioUrl en base. */
  audioUrl?: string;
  /**
   * Script audio (Hören) : la transcription à faire lire/enregistrer. Généré
   * en même temps que les questions et conservé même sans synthèse
   * ElevenLabs, pour produire l'audio manuellement puis l'uploader.
   */
  script?: HoerenScriptContent;
}

/* ---------- Lesen Teil 1 — TITLE_MATCHING ---------- */

/** Partagé par le Teil : la banque des 10 titres (5 corrects + 5 distracteurs). */
export interface TitleMatchingShared extends SharedBase {
  titles: { id: string; text: string }[];
}
/** Par question : un des 5 textes à apparier. */
export interface TitleMatchingContent {
  text: string;
}

/* ---------- MULTIPLE_CHOICE (Lesen T2, Hören T1–T3, Sprachbausteine T2) ---------- */

export interface MultipleChoiceShared extends SharedBase {
  /** Texte source (Lesen Teil 2) — absent pour Hören. */
  sourceText?: string;
}
export interface MultipleChoiceContent {
  question: string;
  options: { id: string; text: string }[];
}

/* ---------- Lesen Teil 3 — AD_MATCHING ---------- */

/** Partagé par le Teil : les 12 annonces A–L. */
export interface AdMatchingShared extends SharedBase {
  ads: { key: string; text: string }[]; // key : "A"… "L"
}
/** Par question : une des 10 situations. L'option "X" est ajoutée par le moteur. */
export interface AdMatchingContent {
  situation: string;
}

/* ---------- Sprachbausteine Teil 1 — CLOZE_DROPDOWN ---------- */

/** Partagé par le Teil : le texte à trous, lacunes notées {{1}} … {{n}}. */
export interface ClozeDropdownShared extends SharedBase {
  text: string;
  /**
   * Banque de mots commune à toutes les lacunes (Sprachbausteine Teil 2 :
   * 15 mots A–O). Si présente, les questions peuvent laisser leurs
   * options vides — le rendu utilise la banque.
   */
  wordBank?: { id: string; text: string }[];
}
/** Par question : les options d'une lacune. */
export interface ClozeDropdownContent {
  gapIndex: number;
  options: { id: string; text: string }[];
}

/* ---------- Schreiben — WRITING ---------- */

export interface WritingContent {
  prompt: string;
  /** Points à traiter (Leitpunkte). */
  bulletPoints: string[];
  minWords?: number;
}

/* ---------- Contenu assemblé d'un examen (côté rendu) ---------- */

/**
 * Question telle que servie aux composants de rendu.
 * NE CONTIENT JAMAIS la clé de correction (answerKey) : celle-ci reste
 * côté serveur/scoring (Sprint 8) et n'est jamais envoyée au client.
 */
export interface ContentQuestion<T> {
  id: string;
  position: number;
  content: T;
  points: number;
}

/**
 * Contenu complet d'un Teil, discriminé par type de question —
 * miroir applicatif des modèles ExamPart + Question de la base.
 */
export type PartContent =
  | {
      type: "TITLE_MATCHING";
      shared: TitleMatchingShared;
      questions: ContentQuestion<TitleMatchingContent>[];
    }
  | {
      type: "MULTIPLE_CHOICE";
      shared: MultipleChoiceShared;
      questions: ContentQuestion<MultipleChoiceContent>[];
    }
  | {
      type: "AD_MATCHING";
      shared: AdMatchingShared;
      questions: ContentQuestion<AdMatchingContent>[];
    }
  | {
      type: "CLOZE_DROPDOWN";
      shared: ClozeDropdownShared;
      questions: ContentQuestion<ClozeDropdownContent>[];
    }
  | {
      type: "WRITING";
      shared: SharedBase;
      questions: ContentQuestion<WritingContent>[];
    };

/** Contenu complet d'un examen, indexé par "sectionId/partId". */
export interface ExamContentBundle {
  examId: string;
  title: string;
  level: "B1" | "B2";
  parts: Record<string, PartContent>;
}
