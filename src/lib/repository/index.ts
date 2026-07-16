import { ApiSessionRepository } from "./api.repository";
import type { SessionRepository } from "./session-repository";

export type { SessionRepository } from "./session-repository";
export { LocalStorageSessionRepository } from "./local-storage.repository";
export { ApiSessionRepository } from "./api.repository";

/**
 * Point d'injection unique du repository.
 * Bascule v1 → v2 effectuée : les sessions sont persistées en base via
 * l'API (ApiSessionRepository), cloisonnées par utilisateur. La variante
 * LocalStorage reste exportée pour le développement hors-ligne.
 */
export const sessionRepository: SessionRepository =
  new ApiSessionRepository();
