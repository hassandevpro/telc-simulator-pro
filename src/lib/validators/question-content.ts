import { z } from "zod";

/**
 * Validation runtime des contenus de Teil — miroir strict des types de
 * src/types/question-content.ts. Consommée par l'API admin (PUT part) :
 * aucun contenu invalide n'entre en base.
 */

const idText = z.object({ id: z.string().min(1), text: z.string().min(1) });

const sharedBase = {
  instructions: z.string().optional(),
  audioUrl: z.string().optional(),
};

/** Question éditée par l'admin — answerKey null pour WRITING. */
const questionBase = {
  position: z.number().int().min(1),
  points: z.number().positive(),
  answerKey: z.string().min(1).nullable(),
};

export const partContentPayloadSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("TITLE_MATCHING"),
    shared: z.object({ ...sharedBase, titles: z.array(idText).min(2) }),
    questions: z
      .array(
        z.object({
          ...questionBase,
          content: z.object({ text: z.string().min(1) }),
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.literal("MULTIPLE_CHOICE"),
    shared: z.object({ ...sharedBase, sourceText: z.string().optional() }),
    questions: z
      .array(
        z.object({
          ...questionBase,
          content: z.object({
            question: z.string().min(1),
            options: z.array(idText).min(2),
          }),
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.literal("AD_MATCHING"),
    shared: z.object({
      ...sharedBase,
      ads: z
        .array(z.object({ key: z.string().min(1), text: z.string().min(1) }))
        .min(2),
    }),
    questions: z
      .array(
        z.object({
          ...questionBase,
          content: z.object({ situation: z.string().min(1) }),
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.literal("CLOZE_DROPDOWN"),
    shared: z.object({
      ...sharedBase,
      text: z.string().min(1),
      wordBank: z.array(idText).optional(),
    }),
    questions: z
      .array(
        z.object({
          ...questionBase,
          content: z.object({
            gapIndex: z.number().int().min(1),
            options: z.array(idText),
          }),
        }),
      )
      .min(1),
  }),
  z.object({
    type: z.literal("WRITING"),
    shared: z.object({ ...sharedBase }),
    questions: z
      .array(
        z.object({
          ...questionBase,
          answerKey: z.null(),
          content: z.object({
            prompt: z.string().min(1),
            bulletPoints: z.array(z.string().min(1)),
            minWords: z.number().int().positive().optional(),
          }),
        }),
      )
      .min(1),
  }),
]);

export type PartContentPayload = z.infer<typeof partContentPayloadSchema>;
