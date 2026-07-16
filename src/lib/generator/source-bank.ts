import type {
  AdMatchingMaterial,
  ContentSource,
  HoerenMcMaterial,
  HoerenTfMaterial,
  LesenTeil1Material,
  LesenTeil2Material,
  SbTeil1Material,
  SbTeil2Material,
  SchreibenTask,
} from "./types";
import type { Rng } from "./rng";
import {
  LESEN_TEIL1_DISTRACTOR_TITLES,
  LESEN_TEIL1_TEXTS,
} from "./bank/lesen-teil-1";
import { LESEN_TEIL2_SEEDS } from "./bank/lesen-teil-2";
import { LESEN_TEIL3_SETS } from "./bank/lesen-teil-3";
import { SB_TEIL1_SETS, SB_TEIL2_SETS } from "./bank/sprachbausteine";
import {
  HOEREN_TEIL1_SETS,
  HOEREN_TEIL2_SETS,
  HOEREN_TEIL3_SETS,
  type HoerenMcSet,
} from "./bank/hoeren";
import { SCHREIBEN_SEEDS } from "./bank/schreiben";

/**
 * Source de matière basée sur la BANQUE de contenus originaux (mode par
 * défaut). Sélectionne — de façon reproductible via `rng` — la quantité de
 * matière demandée par le moteur. Un futur `AiSource` implémentera la même
 * interface en interrogeant l'API Claude ; le moteur ne verra pas la
 * différence (seam décrit dans types.ContentSource).
 */
export const bankSource: ContentSource = {
  lesenTeil1(
    rng: Rng,
    need: { texts: number; distractorTitles: number },
  ): LesenTeil1Material {
    return {
      texts: rng.sample(LESEN_TEIL1_TEXTS, need.texts),
      distractorTitles: rng.sample(
        LESEN_TEIL1_DISTRACTOR_TITLES,
        need.distractorTitles,
      ),
    };
  },

  lesenTeil2(rng: Rng, need: { questions: number }): LesenTeil2Material {
    const seed = rng.pick(LESEN_TEIL2_SEEDS);
    if (seed.questions.length < need.questions) {
      throw new Error(
        `Banque Lesen T2 « ${seed.theme} » : ${seed.questions.length} questions < ${need.questions} requises.`,
      );
    }
    return {
      sourceText: seed.sourceText,
      // On garde l'ordre des questions (elles suivent le fil du texte),
      // on tronque seulement si la structure en demande moins.
      questions: seed.questions.slice(0, need.questions).map((q) => ({
        prompt: q.prompt,
        correct: q.correct,
        distractors: [...q.distractors],
      })),
    };
  },

  lesenTeil3(
    rng: Rng,
    need: { ads: number; situations: number },
  ): AdMatchingMaterial {
    const set = rng.pick(LESEN_TEIL3_SETS);
    if (set.ads.length !== need.ads || set.situations.length !== need.situations) {
      throw new Error(
        `Banque Lesen T3 « ${set.theme} » : ${set.ads.length} annonces / ${set.situations.length} situations ≠ ${need.ads}/${need.situations} requis.`,
      );
    }
    return {
      ads: set.ads.map((a) => ({ ...a })),
      situations: set.situations.map((s) => ({ ...s })),
    };
  },

  sprachbausteineTeil1(rng: Rng, need: { gaps: number }): SbTeil1Material {
    const set = rng.pick(SB_TEIL1_SETS);
    if (set.gaps.length !== need.gaps) {
      throw new Error(
        `Banque SB T1 « ${set.theme} » : ${set.gaps.length} lacunes ≠ ${need.gaps} requises.`,
      );
    }
    return {
      text: set.text,
      gaps: set.gaps.map((g) => ({ correct: g.correct, distractors: [...g.distractors] })),
    };
  },

  sprachbausteineTeil2(
    rng: Rng,
    need: { gaps: number; bankSize: number },
  ): SbTeil2Material {
    const set = rng.pick(SB_TEIL2_SETS);
    const bankSize = set.solutions.length + set.distractorWords.length;
    if (set.solutions.length !== need.gaps || bankSize !== need.bankSize) {
      throw new Error(
        `Banque SB T2 « ${set.theme} » : ${set.solutions.length} solutions / banque ${bankSize} ≠ ${need.gaps}/${need.bankSize} requis.`,
      );
    }
    return {
      text: set.text,
      solutions: [...set.solutions],
      distractorWords: [...set.distractorWords],
    };
  },

  hoerenTeil1(rng: Rng, need: { questions: number }): HoerenMcMaterial {
    return pickHoerenMc(rng, HOEREN_TEIL1_SETS, need.questions, "T1");
  },

  hoerenTeil2(rng: Rng, need: { statements: number }): HoerenTfMaterial {
    const set = rng.pick(HOEREN_TEIL2_SETS);
    if (set.statements.length < need.statements) {
      throw new Error(
        `Banque Hören T2 « ${set.theme} » : ${set.statements.length} affirmations < ${need.statements}.`,
      );
    }
    return {
      script: { ...set.script },
      statements: set.statements.slice(0, need.statements).map((s) => ({ ...s })),
    };
  },

  hoerenTeil3(rng: Rng, need: { questions: number }): HoerenMcMaterial {
    return pickHoerenMc(rng, HOEREN_TEIL3_SETS, need.questions, "T3");
  },

  schreiben(rng: Rng, need: { count: number }): SchreibenTask[] {
    if (SCHREIBEN_SEEDS.length < need.count) {
      throw new Error(
        `Banque Schreiben : ${SCHREIBEN_SEEDS.length} sujets < ${need.count} requis.`,
      );
    }
    return rng.sample(SCHREIBEN_SEEDS, need.count).map((s) => ({
      prompt: s.prompt,
      bulletPoints: [...s.bulletPoints],
      minWords: s.minWords,
      modelAnswer: s.modelAnswer,
      criteria: [...s.criteria],
    }));
  },
};

/** Tire un set Hören QCM et vérifie le nombre de questions. */
function pickHoerenMc(
  rng: Rng,
  sets: HoerenMcSet[],
  need: number,
  label: string,
): HoerenMcMaterial {
  const set = rng.pick(sets);
  if (set.questions.length < need) {
    throw new Error(
      `Banque Hören ${label} « ${set.theme} » : ${set.questions.length} questions < ${need}.`,
    );
  }
  return {
    script: { ...set.script },
    questions: set.questions.slice(0, need).map((q) => ({
      prompt: q.prompt,
      correct: q.correct,
      distractors: [...q.distractors],
    })),
  };
}
