import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";
import { getSupabaseStorage } from "@/lib/supabase-storage";
import { getStructureForLevel } from "@/config/exam-structure";
import { generateExam, validateExam } from "@/lib/generator";
import { persistGeneratedExam } from "@/lib/generator/persist";
import {
  ElevenLabsError,
  synthesizeHoerenScript,
} from "@/lib/generator/audio/elevenlabs";
import type { Level } from "@/types/exam";

/**
 * Génère un examen telc INÉDIT, le valide, le persiste (jouable/éditable dans
 * l'admin) et, si demandé, synthétise les trois audios Hören en allemand via
 * ElevenLabs puis les rattache aux Teile.
 *
 * Corps : { seed?, title?, level?: "B1"|"B2", withAudio?: boolean }.
 * L'examen est TOUJOURS créé même si l'audio échoue : dans ce cas la réponse
 * décrit précisément le problème (clé invalide, quota, limite) pour que
 * l'utilisateur fournisse une nouvelle clé et relance seulement l'audio.
 */
export async function POST(request: Request) {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    seed?: string;
    title?: string;
    level?: Level;
    withAudio?: boolean;
  } | null;

  const level: Level = body?.level === "B1" ? "B1" : "B2";
  const structure = getStructureForLevel(level);

  // 1. Génération
  const exam = await generateExam({
    seed: body?.seed,
    title: body?.title,
    level,
  });

  // 2. Validation qualité (bloquante)
  const validation = validateExam(structure, exam);
  if (!validation.ok) {
    return NextResponse.json(
      { error: "Generierter Test ungültig.", details: validation.errors },
      { status: 422 },
    );
  }

  // 3. Persistance
  const persisted = await persistGeneratedExam(exam);

  // 4. Audio Hören (optionnel)
  let audio: AudioResult = { requested: Boolean(body?.withAudio), status: "skipped" };
  if (body?.withAudio) {
    audio = await synthesizeAndAttach(exam, persisted.partIdByKey);
  }

  return NextResponse.json(
    {
      id: persisted.examId,
      seed: exam.seed,
      title: exam.title,
      level: exam.level,
      questionCount: persisted.questionCount,
      audio,
      // Scripts Hören TOUJOURS renvoyés — sans ElevenLabs, ils servent à
      // enregistrer l'audio à la main puis à l'uploader par Teil.
      scripts: exam.hoerenScripts.map((s) => ({
        partKey: s.partKey,
        speakers: s.speakers,
        targetSeconds: s.targetSeconds,
        text: s.text,
      })),
    },
    { status: 201 },
  );
}

interface AudioResult {
  requested: boolean;
  status: "skipped" | "done" | "partial" | "error" | "unconfigured";
  generated?: string[];
  error?: { kind: string; message: string; failedPart?: string };
}

/**
 * Synthétise chaque script Hören et met à jour ExamPart.audioUrl. S'arrête
 * à la première erreur ElevenLabs et la renvoie de façon exploitable — les
 * audios déjà produits restent attachés (résultat « partial »).
 */
async function synthesizeAndAttach(
  exam: Awaited<ReturnType<typeof generateExam>>,
  partIdByKey: Record<string, string>,
): Promise<AudioResult> {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return {
      requested: true,
      status: "error",
      error: { kind: "auth", message: "ELEVENLABS_API_KEY nicht gesetzt." },
    };
  }

  const storage = getSupabaseStorage();
  if (!storage) {
    return {
      requested: true,
      status: "unconfigured",
      error: {
        kind: "storage",
        message: "Cloud-Speicher (bucket audio) nicht konfiguriert.",
      },
    };
  }

  const model = process.env.ELEVENLABS_MODEL || undefined;
  const voicePool = (process.env.ELEVENLABS_VOICES || "")
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);

  const generated: string[] = [];
  for (const script of exam.hoerenScripts) {
    const partId = partIdByKey[script.partKey];
    if (!partId) continue;
    try {
      const mp3 = await synthesizeHoerenScript(script, {
        apiKey,
        model,
        voicePool: voicePool.length ? voicePool : undefined,
      });
      const fileName = `${exam.seed}-${script.partKey.replace("/", "-")}.mp3`;
      const { error } = await storage.upload(fileName, mp3, {
        contentType: "audio/mpeg",
        cacheControl: "31536000",
        upsert: true,
      });
      if (error) throw new Error(error.message);
      const url = storage.getPublicUrl(fileName).data.publicUrl;
      await db.examPart.update({ where: { id: partId }, data: { audioUrl: url } });
      generated.push(script.partKey);
    } catch (err) {
      if (err instanceof ElevenLabsError) {
        return {
          requested: true,
          status: generated.length ? "partial" : "error",
          generated,
          error: { kind: err.kind, message: err.message, failedPart: script.partKey },
        };
      }
      return {
        requested: true,
        status: generated.length ? "partial" : "error",
        generated,
        error: {
          kind: "upload",
          message: (err as Error).message,
          failedPart: script.partKey,
        },
      };
    }
  }

  return { requested: true, status: "done", generated };
}
