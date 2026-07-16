import { LocalStorageSessionRepository } from "./local-storage.repository";
import type { SessionRepository } from "./session-repository";

export type { SessionRepository } from "./session-repository";
export { LocalStorageSessionRepository } from "./local-storage.repository";
export { ApiSessionRepository } from "./api.repository";

/**
 * Point d'injection unique du repository.
 * La bascule v1 → v2 (LocalStorage → API/PostgreSQL) se fait ICI,
 * et uniquement ici.
 */
export const sessionRepository: SessionRepository =
  new LocalStorageSessionRepository();
