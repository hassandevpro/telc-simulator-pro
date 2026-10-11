import "server-only";
import { access } from "node:fs/promises";
import path from "node:path";
import { getStructureForLevel } from "@/config/exam-structure";
import { audioPathFromPublicUrl, isSafeAudioPath, isStaticAudioPath } from "@/lib/audio-path";
import { db } from "@/lib/db";
import { getPartAudioLocation } from "@/lib/exam-content";
import { isOverdue } from "@/lib/session-lifecycle";
import { getSupabaseStorage } from "@/lib/supabase-storage";
import type { Level } from "@/types/exam";

/**
 * ACCÈS CONTRÔLÉ AUX AUDIOS HÖREN — seule voie par laquelle un candidat
 * obtient un fichier audio.
 *
 * Le bucket « audio » est PRIVÉ : aucune URL permanente n'existe. Le candidat
 * demande une URL SIGNÉE à /api/sessions/{id}/audio/{section}/{teil}, que le
 * serveur n'accorde qu'après avoir vérifié :
 *   1. l'identité (session d'authentification) ;
 *   2. que la session lui APPARTIENT ;
 *   3. que l'épreuve est EN COURS et dans son temps (échéance serveur) ;
 *   4. que le Teil a bien un audio ;
 *   5. que cet audio n'a pas déjà été ÉCOUTÉ (signalé par le navigateur à
 *      l'événement `play`) ;
 *   6. que le nombre d'URL déjà émises pour cet audio n'atteint pas
 *      MAX_AUDIO_ISSUANCES (compteur atomique en base).
 *
 * CE QUE CELA GARANTIT — et ce que cela ne garantit PAS
 * -----------------------------------------------------
 * Garanti par le serveur : aucun accès sans authentification, sans session
 * possédée, hors épreuve, ou au-delà de 2 émissions ; aucun fichier n'est
 * joignable par une URL permanente ; une URL partagée expire.
 * NON garanti :
 *   - une URL signée reste utilisable par quiconque la possède jusqu'à son
 *     expiration (AUDIO_URL_TTL_SECONDS) ;
 *   - un audio entendu peut être ENREGISTRÉ (capture du son, téléchargement
 *     de l'URL pendant sa validité) ;
 *   - « une seule écoute » est une règle d'interface (le lecteur n'offre ni
 *     pause ni retour) que le serveur appuie par la limite d'émissions, mais
 *     il ne peut pas empêcher de rejouer un fichier déjà téléchargé.
 */

/** Émissions d'URL autorisées par audio tant que l'écoute n'a pas commencé. */
export const MAX_AUDIO_ISSUANCES = 2;

/**
 * Validité d'une URL signée. Doit couvrir TOUTE la lecture, requêtes HTTP
 * partielles (Range) comprises : le navigateur recharge des morceaux du
 * fichier pendant l'écoute avec la même URL. 20 min par défaut pour des
 * pistes Hören de 10 min maximum ; réglable (5 min – 1 h).
 */
export function audioUrlTtlSeconds(): number {
  const raw = Number(process.env.AUDIO_URL_TTL_SECONDS);
  const value = Number.isFinite(raw) && raw > 0 ? raw : 1200;
  return Math.min(3600, Math.max(300, Math.round(value)));
}

export interface AudioIssueOk {
  ok: true;
  url: string;
  /** epoch ms de fin de validité (null pour un fichier statique public). */
  expiresAt: number | null;
  kind: "signed" | "static";
}
export interface AudioIssueError {
  ok: false;
  status: number;
  code: string;
  error: string;
}
export type AudioIssueResult = AudioIssueOk | AudioIssueError;

const fail = (status: number, code: string, error: string): AudioIssueError => ({
  ok: false,
  status,
  code,
  error,
});

/** Résolution de l'emplacement : chemin privé, ou fichier statique public. */
export function resolveAudioSource(location: {
  path: string | null;
  url: string | null;
}): { kind: "private"; path: string } | { kind: "static"; url: string } | null {
  if (location.path) {
    return isSafeAudioPath(location.path) ? { kind: "private", path: location.path } : null;
  }
  // Ligne non migrée : le chemin se déduit de l'ancienne URL publique.
  const derived = audioPathFromPublicUrl(location.url);
  if (derived) return { kind: "private", path: derived };
  if (isStaticAudioPath(location.url)) return { kind: "static", url: location.url };
  return null;
}

/** Réservation atomique d'une émission (voir doc du fichier, point 6). */
async function reserveIssuance(sessionId: string, audioId: string): Promise<boolean> {
  const updated = await db.$executeRaw`
    UPDATE "ExamSession"
    SET "audioIssued" = jsonb_set(
      "audioIssued",
      ARRAY[${audioId}]::text[],
      to_jsonb(COALESCE(("audioIssued"->>${audioId})::int, 0) + 1),
      true
    )
    WHERE "id" = ${sessionId}
      AND "status" = 'IN_PROGRESS'
      AND COALESCE(("audioIssued"->>${audioId})::int, 0) < ${MAX_AUDIO_ISSUANCES}
      AND NOT jsonb_exists("audioPlayed", ${audioId})
  `;
  return updated === 1;
}

/** Rend une émission réservée si la signature a échoué (le candidat n'a rien reçu). */
async function releaseIssuance(sessionId: string, audioId: string): Promise<void> {
  await db.$executeRaw`
    UPDATE "ExamSession"
    SET "audioIssued" = jsonb_set(
      "audioIssued",
      ARRAY[${audioId}]::text[],
      to_jsonb(GREATEST(COALESCE(("audioIssued"->>${audioId})::int, 0) - 1, 0)),
      true
    )
    WHERE "id" = ${sessionId}
  `;
}

export async function issueAudioUrl(params: {
  sessionId: string;
  userId: string;
  sectionId: string;
  partId: string;
}): Promise<AudioIssueResult> {
  const { sessionId, userId, sectionId, partId } = params;

  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    select: {
      userId: true,
      examId: true,
      status: true,
      startedAt: true,
      audioPlayed: true,
      exam: { select: { level: true } },
    },
  });
  // Session inconnue OU à quelqu'un d'autre : même réponse (pas de fuite d'existence).
  if (!row || row.userId !== userId) return fail(404, "NOT_FOUND", "Nicht gefunden.");

  if (row.status !== "IN_PROGRESS" || row.startedAt === null || isOverdue(row)) {
    return fail(409, "SESSION_NOT_OPEN", "Die Prüfung ist nicht geöffnet.");
  }

  // Seuls les Teile Hören de la structure officielle portent un audio.
  const structure = getStructureForLevel(row.exam.level as Level);
  const section = structure.schriftlichePruefung.sections.find((s) => s.id === sectionId);
  if (sectionId !== "hoeren" || !section?.parts.some((p) => p.id === partId)) {
    return fail(404, "NO_AUDIO", "Kein Audio für diesen Teil.");
  }

  const location = await getPartAudioLocation(row.examId, "hoeren", partId);
  const source = resolveAudioSource(location);
  if (!source) return fail(404, "NO_AUDIO", "Kein Audio für diesen Teil.");

  const audioId = `${sectionId}/${partId}`;
  const played = Array.isArray(row.audioPlayed) ? (row.audioPlayed as string[]) : [];
  if (played.includes(audioId)) {
    return fail(409, "AUDIO_ALREADY_PLAYED", "Dieses Audio wurde bereits abgespielt.");
  }

  // Le stockage doit être joignable AVANT de consommer une émission.
  const storage = source.kind === "private" ? getSupabaseStorage() : null;
  let localUrl: string | null = null;
  if (source.kind === "private" && !storage) {
    // Développement sans Supabase : fichier local public (jamais en production).
    localUrl = await localDevUrl(source.path);
    if (!localUrl) {
      return fail(503, "STORAGE_UNAVAILABLE", "Audiospeicher nicht verfügbar.");
    }
  }

  if (!(await reserveIssuance(sessionId, audioId))) {
    return fail(
      409,
      "AUDIO_LIMIT_REACHED",
      "Dieses Audio kann nicht erneut angefordert werden.",
    );
  }

  try {
    if (source.kind === "static") {
      return { ok: true, url: source.url, expiresAt: null, kind: "static" };
    }
    if (localUrl) return { ok: true, url: localUrl, expiresAt: null, kind: "static" };

    const ttl = audioUrlTtlSeconds();
    const { data, error } = await storage!.createSignedUrl(source.path, ttl);
    if (error || !data?.signedUrl) throw new Error(error?.message ?? "signature impossible");
    return { ok: true, url: data.signedUrl, expiresAt: Date.now() + ttl * 1000, kind: "signed" };
  } catch (cause) {
    console.error("[audio] signature impossible", cause);
    await releaseIssuance(sessionId, audioId).catch(() => undefined);
    return fail(503, "STORAGE_UNAVAILABLE", "Audiospeicher nicht verfügbar.");
  }
}

/** Dev uniquement : fichier présent dans public/uploads/audio. */
async function localDevUrl(fileName: string): Promise<string | null> {
  if (process.env.NODE_ENV === "production") return null;
  try {
    await access(path.join(process.cwd(), "public", "uploads", "audio", fileName));
    return `/uploads/audio/${fileName}`;
  } catch {
    return null;
  }
}
