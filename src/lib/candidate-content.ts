import type {
  ContentQuestion,
  ExamContentBundle,
  PartContent,
} from "@/types/question-content";

/**
 * PROJECTION CANDIDAT du contenu d'un examen.
 *
 * Tout ce que le serveur envoie à un candidat (HTML initial, charge RSC,
 * propriétés des composants client) passe par ce module. Il applique une
 * LISTE BLANCHE de champs par type de question : un champ inconnu n'est
 * jamais transmis, même si quelqu'un l'ajoute un jour au contenu stocké.
 *
 * Pourquoi une liste blanche et non « retirer script » : le contenu stocké
 * est un JSON libre (`ExamPart.sharedContent`, `Question.content`) rempli
 * par l'admin et par le générateur. La transcription Hören (`script`) y
 * vivait à côté du contenu affichable ; la retirer par son nom laisserait
 * fuiter le prochain champ sensible (indice, explication, corrigé).
 *
 * Aucun champ audio n'est transmis non plus : le candidat reçoit seulement
 * `hasAudio`, et obtient une URL signée à la demande auprès de la route
 * /api/sessions/{id}/audio/… (contrôlée par le serveur).
 */

type Rec = Record<string, unknown>;

const isRec = (value: unknown): value is Rec =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** Copie `keys` de `source`, en ignorant tout le reste. */
function pick(source: unknown, keys: readonly string[]): Rec {
  const out: Rec = {};
  if (!isRec(source)) return out;
  for (const key of keys) {
    if (source[key] !== undefined) out[key] = source[key];
  }
  return out;
}

/** Liste d'objets { a, b } : ne garde que les clés autorisées de chaque entrée. */
function pickList(source: unknown, keys: readonly string[]): Rec[] | undefined {
  if (!Array.isArray(source)) return undefined;
  return source.map((entry) => pick(entry, keys));
}

const ID_TEXT = ["id", "text"] as const;

/** Contenu partagé du Teil, réduit aux champs affichables. */
function candidateShared(type: PartContent["type"], shared: unknown): Rec {
  const base = pick(shared, ["instructions"]);
  switch (type) {
    case "TITLE_MATCHING":
      return { ...base, titles: pickList((shared as Rec)?.titles, ID_TEXT) ?? [] };
    case "MULTIPLE_CHOICE":
      return { ...base, ...pick(shared, ["sourceText"]) };
    case "AD_MATCHING":
      return { ...base, ads: pickList((shared as Rec)?.ads, ["key", "text"]) ?? [] };
    case "CLOZE_DROPDOWN": {
      const wordBank = pickList((shared as Rec)?.wordBank, ID_TEXT);
      return {
        ...base,
        ...pick(shared, ["text"]),
        ...(wordBank ? { wordBank } : {}),
      };
    }
    case "WRITING":
      return base;
  }
}

/** Contenu d'une question, réduit aux champs affichables. */
function candidateQuestionContent(type: PartContent["type"], content: unknown): Rec {
  switch (type) {
    case "TITLE_MATCHING":
      return pick(content, ["text"]);
    case "MULTIPLE_CHOICE":
      return {
        ...pick(content, ["question"]),
        options: pickList((content as Rec)?.options, ID_TEXT) ?? [],
      };
    case "AD_MATCHING":
      return pick(content, ["situation"]);
    case "CLOZE_DROPDOWN":
      return {
        ...pick(content, ["gapIndex"]),
        options: pickList((content as Rec)?.options, ID_TEXT) ?? [],
      };
    case "WRITING":
      return {
        ...pick(content, ["prompt", "minWords"]),
        bulletPoints: Array.isArray((content as Rec)?.bulletPoints)
          ? ((content as Rec).bulletPoints as unknown[]).filter(
              (point): point is string => typeof point === "string",
            )
          : [],
      };
  }
}

/**
 * Projection d'un Teil pour le candidat. `hasAudio` indique qu'un audio est
 * rattaché ; son emplacement (chemin de stockage, URL) n'est jamais transmis.
 */
export function toCandidatePart(part: PartContent, hasAudio: boolean): PartContent {
  const questions = part.questions.map((question) => ({
    id: question.id,
    position: question.position,
    points: question.points,
    content: candidateQuestionContent(part.type, question.content),
  })) as ContentQuestion<never>[];

  return {
    type: part.type,
    shared: {
      ...candidateShared(part.type, part.shared),
      ...(hasAudio ? { hasAudio: true } : {}),
    },
    questions,
  } as PartContent;
}

/** Projection d'un examen entier pour le candidat. */
export function toCandidateBundle(
  bundle: ExamContentBundle,
  audioParts: ReadonlySet<string>,
): ExamContentBundle {
  const parts: Record<string, PartContent> = {};
  for (const [key, part] of Object.entries(bundle.parts)) {
    parts[key] = toCandidatePart(part, audioParts.has(key));
  }
  return { examId: bundle.examId, title: bundle.title, level: bundle.level, parts };
}
