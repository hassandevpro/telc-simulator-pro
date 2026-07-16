import type { HoerenScript } from "../types";

/**
 * Synthèse vocale des scripts Hören via l'API ElevenLabs, en ALLEMAND.
 *
 * Modèle par défaut : `eleven_multilingual_v2` (prononciation allemande
 * standard). Chaque locuteur du dialogue reçoit une voix différente ; les
 * répliques sont synthétisées séparément puis concaténées, ce qui donne un
 * vrai échange à plusieurs voix pour les Teile 1 et 2.
 *
 * Gestion d'erreur (conforme à la consigne) : toute réponse non-OK lève une
 * `ElevenLabsError` typée (clé invalide, quota, limite de débit). L'appelant
 * arrête alors la synthèse concernée, explique le problème et demande une
 * nouvelle clé avant de réessayer.
 */

const API = "https://api.elevenlabs.io/v1/text-to-speech";
const DEFAULT_MODEL = "eleven_multilingual_v2";

/**
 * Voix ElevenLabs adaptées à l'allemand (modèle multilingue). Ce sont des
 * voix « premade » aux identifiants stables. Pour des voix NATIVES allemandes
 * de votre bibliothèque, surchargez le pool via les variables d'environnement
 * ELEVENLABS_VOICES (voir la route de génération).
 */
export const GERMAN_VOICE_POOL: { name: string; voiceId: string; gender: "m" | "f" }[] = [
  { name: "Rachel", voiceId: "21m00Tcm4TlvDq8ikWAM", gender: "f" },
  { name: "Antoni", voiceId: "ErXwobaYiN019PkySvjV", gender: "m" },
  { name: "Elli", voiceId: "MF3mGyEYCl7XYWbV9V6O", gender: "f" },
  { name: "Adam", voiceId: "pNInz6obpgDQGcFmaJgB", gender: "m" },
  { name: "Bella", voiceId: "EXAVITQu4vr4xnSDxMaL", gender: "f" },
  { name: "Josh", voiceId: "TxGEqnHWrfWFTfGW9XjX", gender: "m" },
];

export type ElevenLabsErrorKind =
  | "auth" // clé invalide / manquante (401)
  | "quota" // crédits épuisés (401/403 quota_exceeded)
  | "rate_limit" // trop de requêtes (429)
  | "http"; // autre erreur HTTP

export class ElevenLabsError extends Error {
  constructor(
    message: string,
    readonly kind: ElevenLabsErrorKind,
    readonly status?: number,
  ) {
    super(message);
    this.name = "ElevenLabsError";
  }
}

export interface SynthOptions {
  apiKey: string;
  model?: string;
  /** Pool de voix (voiceId) ; défaut = GERMAN_VOICE_POOL. */
  voicePool?: string[];
  /** Multi-voix quand le script a plusieurs locuteurs (défaut : true). */
  multiVoice?: boolean;
}

/** Un segment de script : un locuteur, une réplique. */
interface Segment {
  speaker: string;
  text: string;
}

/**
 * Découpe un script « Locuteur: réplique » en segments. Les lignes sans
 * préfixe de locuteur connu sont rattachées au segment précédent (texte
 * multiligne). En l'absence totale de locuteur, tout le texte forme un seul
 * segment de narration.
 */
export function splitScript(script: HoerenScript): Segment[] {
  const known = new Set(script.speakers.map((s) => s.trim()));
  const segments: Segment[] = [];
  for (const rawLine of script.text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    const m = line.match(/^([^:]{1,40}):\s*(.*)$/);
    if (m && known.has(m[1].trim())) {
      segments.push({ speaker: m[1].trim(), text: m[2].trim() });
    } else if (segments.length > 0) {
      segments[segments.length - 1].text += " " + line;
    } else {
      segments.push({ speaker: script.speakers[0] ?? "narrator", text: line });
    }
  }
  return segments;
}

/** Appelle l'API pour un seul segment de texte avec une voix donnée. */
async function ttsRequest(
  text: string,
  voiceId: string,
  apiKey: string,
  model: string,
): Promise<Buffer> {
  let res: Response;
  try {
    res = await fetch(`${API}/${voiceId}`, {
      method: "POST",
      headers: {
        "xi-api-key": apiKey,
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text,
        model_id: model,
        voice_settings: { stability: 0.5, similarity_boost: 0.75, style: 0.2 },
      }),
    });
  } catch (cause) {
    throw new ElevenLabsError(
      `Netzwerkfehler bei ElevenLabs: ${(cause as Error).message}`,
      "http",
    );
  }

  if (!res.ok) {
    const bodyText = await res.text().catch(() => "");
    if (res.status === 401)
      throw new ElevenLabsError("ElevenLabs-Schlüssel ungültig oder fehlt.", "auth", 401);
    if (res.status === 403 || /quota/i.test(bodyText))
      throw new ElevenLabsError("ElevenLabs-Guthaben erschöpft.", "quota", res.status);
    if (res.status === 429)
      throw new ElevenLabsError("ElevenLabs-Ratenlimit erreicht.", "rate_limit", 429);
    throw new ElevenLabsError(
      `ElevenLabs-Fehler ${res.status}: ${bodyText.slice(0, 200)}`,
      "http",
      res.status,
    );
  }

  return Buffer.from(await res.arrayBuffer());
}

/**
 * Synthétise un script Hören complet en un seul buffer MP3.
 * Multi-voix : une voix distincte et STABLE par locuteur (répartie dans le
 * pool), répliques concaténées dans l'ordre. Les buffers MP3 d'ElevenLabs se
 * concatènent proprement pour la lecture navigateur.
 */
export async function synthesizeHoerenScript(
  script: HoerenScript,
  opts: SynthOptions,
): Promise<Buffer> {
  if (!opts.apiKey) {
    throw new ElevenLabsError("Kein ElevenLabs-Schlüssel angegeben.", "auth");
  }
  const model = opts.model ?? DEFAULT_MODEL;
  const pool = opts.voicePool?.length
    ? opts.voicePool
    : GERMAN_VOICE_POOL.map((v) => v.voiceId);
  const multiVoice = opts.multiVoice ?? script.speakers.length > 1;

  // Voix stable par locuteur (ordre d'apparition dans script.speakers).
  const voiceOf = new Map<string, string>();
  script.speakers.forEach((sp, i) => voiceOf.set(sp.trim(), pool[i % pool.length]));

  if (!multiVoice) {
    // Une seule voix : on retire les préfixes « Locuteur: ».
    const flat = splitScript(script)
      .map((s) => s.text)
      .join(" ");
    return ttsRequest(flat, pool[0], opts.apiKey, model);
  }

  const chunks: Buffer[] = [];
  for (const seg of splitScript(script)) {
    const voiceId = voiceOf.get(seg.speaker) ?? pool[0];
    chunks.push(await ttsRequest(seg.text, voiceId, opts.apiKey, model));
  }
  return Buffer.concat(chunks);
}
