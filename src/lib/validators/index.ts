/**
 * Schémas Zod du projet.
 * - question-content : validation runtime des champs JSON `content` /
 *   `sharedContent` (branchée avec les formulaires admin, Sprint 10).
 * - payloads API sessions/exams (Sprints 2 et 8).
 * Ce fichier expose uniquement les schémas transverses déjà nécessaires.
 */
import { z } from "zod";

/** Statut de session — miroir de types/session.ts, utilisable côté API. */
export const sessionStatusSchema = z.enum([
  "AUDIO_CHECK",
  "IN_PROGRESS",
  "SUBMITTED",
  "EXPIRED",
  "SCORED",
]);

/** Valeur de réponse candidat. */
export const answerValueSchema = z.string().nullable();

/** Carte des réponses, indexée par identifiant de question. */
export const answerMapSchema = z.record(z.string(), answerValueSchema);

export {
  partContentPayloadSchema,
  type PartContentPayload,
} from "./question-content";
