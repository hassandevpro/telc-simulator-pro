/**
 * Accès aux audios Hören (PostgreSQL réel) : autorisations, état de l'épreuve,
 * limite d'émissions sous requêtes simultanées, administration, génération.
 * Voir tests/helpers/pg.ts pour l'activation (TEST_DATABASE_URL).
 *
 * Le stockage Supabase est un FAUX bucket : ce fichier prouve la logique de
 * décision du serveur, pas la configuration réelle de votre projet Supabase
 * (voir docs/SECURITY.md et `npm run check:audio`).
 */
import { test, before, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import {
  DAY,
  createUser,
  integrationSkip,
  jsonRequest,
  resetDatabase,
  selectTestDatabase,
} from "./helpers/pg";

selectTestDatabase();

const auth = { user: null as { id: string; role?: string } | null };
mock.module("@/lib/auth", {
  namedExports: { auth: async () => (auth.user ? { user: auth.user } : null) },
});

/** Faux bucket privé : enregistre chaque appel. */
const bucket = {
  configured: true,
  signCalls: [] as { path: string; ttl: number }[],
  uploads: [] as { path: string; upsert: unknown }[],
  failNextSign: false,
  failUpload: false,
};
mock.module("@/lib/supabase-storage", {
  namedExports: {
    getSupabaseStorage: () =>
      bucket.configured
        ? {
            createSignedUrl: async (path: string, ttl: number) => {
              if (bucket.failNextSign) {
                bucket.failNextSign = false;
                return { data: null, error: { message: "boom" } };
              }
              bucket.signCalls.push({ path, ttl });
              return {
                data: { signedUrl: `https://projet.supabase.co/storage/v1/object/sign/audio/${path}?token=T${bucket.signCalls.length}` },
                error: null,
              };
            },
            upload: async (path: string, _body: unknown, options: { upsert?: unknown }) => {
              bucket.uploads.push({ path, upsert: options?.upsert });
              return bucket.failUpload ? { error: { message: "exists" } } : { error: null };
            },
            createSignedUploadUrl: async (path: string, options: { upsert?: unknown }) => ({
              data: { path, token: "UPLOAD_TOKEN" },
              error: null,
              upsert: options?.upsert,
            }),
            list: async () => ({ data: [{ name: "a.mp3" }], error: null }),
          }
        : null,
  },
});

mock.module("@/lib/generator/audio/elevenlabs", {
  namedExports: {
    ElevenLabsError: class ElevenLabsError extends Error {},
    synthesizeHoerenScript: async () => Buffer.from("MP3"),
  },
});

let db: typeof import("@/lib/db").db;
type Handler = (request: Request, ctx?: unknown) => Promise<Response>;
let audioRoute: Handler;
let patchSession: Handler;
let previewRoute: Handler;
let signRoute: Handler;
let partRoute: { GET: Handler; PUT: Handler; PATCH: Handler };
let generateRoute: Handler;

before(async () => {
  if (integrationSkip) return;
  db = (await import("@/lib/db")).db;
  audioRoute = (await import("@/app/api/sessions/[sessionId]/audio/[sectionId]/[partId]/route")).POST as Handler;
  patchSession = (await import("@/app/api/sessions/[sessionId]/route")).PATCH as Handler;
  previewRoute = (await import("@/app/api/admin/audio/preview/route")).GET as Handler;
  signRoute = (await import("@/app/api/admin/audio/sign/route")).POST as Handler;
  partRoute = (await import("@/app/api/admin/exams/[examId]/parts/[sectionId]/[partId]/route")) as never;
  generateRoute = (await import("@/app/api/admin/exams/generate/route")).POST as Handler;
});

after(async () => {
  if (!integrationSkip) await db.$disconnect();
});

beforeEach(async () => {
  if (integrationSkip) return;
  await resetDatabase(db);
  auth.user = null;
  bucket.configured = true;
  bucket.signCalls.length = 0;
  bucket.uploads.length = 0;
  bucket.failNextSign = false;
  bucket.failUpload = false;
});

const sessionCtx = (sessionId: string, sectionId = "hoeren", partId = "teil-1") => ({
  params: Promise.resolve({ sessionId, sectionId, partId }),
});

/** Examen avec un Teil Hören portant l'audio donné. */
async function seedExam(audio: { audioPath?: string | null; audioUrl?: string | null } = { audioPath: "piste-1.mp3" }) {
  await db.exam.create({
    data: {
      id: "exam-h",
      title: "Modelltest H",
      level: "B2",
      isPublished: true,
      parts: {
        create: [
          { sectionId: "hoeren", partId: "teil-1", audioPath: audio.audioPath ?? null, audioUrl: audio.audioUrl ?? null },
          { sectionId: "hoeren", partId: "teil-2" },
        ],
      },
    },
  });
}

async function seedSession(
  id: string,
  userId: string,
  extra: { status?: "AUDIO_CHECK" | "IN_PROGRESS" | "EXPIRED" | "SCORED"; startedAt?: Date | null } = {},
) {
  await db.examSession.create({
    data: {
      id,
      userId,
      examId: "exam-h",
      status: extra.status ?? "IN_PROGRESS",
      startedAt: extra.startedAt === undefined ? new Date() : extra.startedAt,
    },
  });
}

const requestAudio = (sessionId: string, sectionId = "hoeren", partId = "teil-1") =>
  audioRoute(
    jsonRequest(`/api/sessions/${sessionId}/audio/${sectionId}/${partId}`, "POST"),
    sessionCtx(sessionId, sectionId, partId),
  );

/* ───────────────────────── Autorisations ───────────────────────── */

test("anonyme : 401, aucune signature", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  assert.equal((await requestAudio("s1")).status, 401);
  assert.equal(bucket.signCalls.length, 0);
});

test("session d'un AUTRE candidat : 404 comme une session inconnue, aucune signature", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "victime" });
  await createUser(db, { id: "attaquant" });
  await seedSession("s1", "victime");
  auth.user = { id: "attaquant" };
  const stolen = await requestAudio("s1");
  const unknown = await requestAudio("inconnue");
  assert.equal(stolen.status, 404);
  assert.deepEqual(await stolen.json(), await unknown.json(), "indiscernable d'une session inexistante");
  assert.equal(bucket.signCalls.length, 0);
});

for (const status of ["AUDIO_CHECK", "EXPIRED", "SCORED"] as const) {
  test(`épreuve non ouverte (${status}) : 409, aucune signature`, { skip: integrationSkip }, async () => {
    await seedExam();
    await createUser(db, { id: "cand" });
    await seedSession("s1", "cand", { status, startedAt: status === "AUDIO_CHECK" ? null : new Date() });
    auth.user = { id: "cand" };
    const response = await requestAudio("s1");
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "SESSION_NOT_OPEN");
    assert.equal(bucket.signCalls.length, 0);
  });
}

test("échéance serveur dépassée (session IN_PROGRESS démarrée il y a 3 h) : 409", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand", { startedAt: new Date(Date.now() - 3 * 3_600_000) });
  auth.user = { id: "cand" };
  assert.equal((await requestAudio("s1")).status, 409);
  assert.equal(bucket.signCalls.length, 0);
});

test("Teil sans audio, section autre que Hören, Teil inconnu : 404", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  auth.user = { id: "cand" };
  assert.equal((await requestAudio("s1", "hoeren", "teil-2")).status, 404, "Teil sans audio");
  assert.equal((await requestAudio("s1", "lesen", "teil-1")).status, 404, "section Lesen");
  assert.equal((await requestAudio("s1", "hoeren", "teil-9")).status, 404, "Teil inconnu");
  assert.equal((await requestAudio("s1", "..", "teil-1")).status, 404, "section forgée");
  assert.equal(bucket.signCalls.length, 0);
});

/* ───────────────────────── URL signée ───────────────────────── */

test("candidat autorisé : URL signée de 20 min, jamais mise en cache, aucune URL publique", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  auth.user = { id: "cand" };

  const response = await requestAudio("s1");
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.kind, "signed");
  assert.match(body.url, /\/storage\/v1\/object\/sign\/audio\/piste-1\.mp3\?token=/);
  assert.ok(!body.url.includes("/object/public/"), "aucune URL publique permanente");
  assert.deepEqual(bucket.signCalls, [{ path: "piste-1.mp3", ttl: 1200 }]);
  // La validité annoncée couvre une écoute complète (≥ 10 min) mais reste bornée.
  const remaining = body.expiresAt - Date.now();
  assert.ok(remaining > 10 * 60_000 && remaining <= 20 * 60_000 + 1000, `validité ${remaining} ms`);
});

test("validité réglable mais bornée (5 min – 1 h)", { skip: integrationSkip }, async () => {
  const { audioUrlTtlSeconds } = await import("@/lib/audio-access");
  const previous = process.env.AUDIO_URL_TTL_SECONDS;
  try {
    for (const [value, expected] of [["60", 300], ["99999", 3600], ["abc", 1200], ["900", 900]] as const) {
      process.env.AUDIO_URL_TTL_SECONDS = value;
      assert.equal(audioUrlTtlSeconds(), expected, value);
    }
  } finally {
    if (previous === undefined) delete process.env.AUDIO_URL_TTL_SECONDS;
    else process.env.AUDIO_URL_TTL_SECONDS = previous;
  }
});

test("audio déjà écouté (signalé à l'événement play) : 409, plus aucune émission", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  auth.user = { id: "cand" };
  assert.equal((await requestAudio("s1")).status, 200);
  await patchSession(
    jsonRequest("/api/sessions/s1", "PATCH", { op: "audio", audioId: "hoeren/teil-1" }),
    { params: Promise.resolve({ sessionId: "s1" }) },
  );
  const again = await requestAudio("s1");
  assert.equal(again.status, 409);
  assert.equal((await again.json()).code, "AUDIO_ALREADY_PLAYED");
  assert.equal(bucket.signCalls.length, 1);
});

test("limite d'émissions : 2 URL maximum tant que l'écoute n'est pas signalée", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  auth.user = { id: "cand" };
  const statuses = [];
  for (let index = 0; index < 4; index += 1) statuses.push((await requestAudio("s1")).status);
  assert.deepEqual(statuses, [200, 200, 409, 409]);
  assert.equal(bucket.signCalls.length, 2);
});

test("20 demandes SIMULTANÉES : exactement 2 URL émises", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  auth.user = { id: "cand" };
  const responses = await Promise.all(Array.from({ length: 20 }, () => requestAudio("s1")));
  const ok = responses.filter((response) => response.status === 200).length;
  assert.equal(ok, 2);
  assert.equal(bucket.signCalls.length, 2);
  const row = await db.examSession.findUniqueOrThrow({ where: { id: "s1" } });
  assert.deepEqual(row.audioIssued, { "hoeren/teil-1": 2 });
});

test("compteurs indépendants par audio et par session", { skip: integrationSkip }, async () => {
  await db.exam.create({
    data: {
      id: "exam-h",
      title: "H",
      level: "B2",
      parts: { create: [
        { sectionId: "hoeren", partId: "teil-1", audioPath: "a.mp3" },
        { sectionId: "hoeren", partId: "teil-2", audioPath: "b.mp3" },
      ] },
    },
  });
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  await seedSession("s2", "cand");
  auth.user = { id: "cand" };
  await requestAudio("s1", "hoeren", "teil-1");
  await requestAudio("s1", "hoeren", "teil-1");
  assert.equal((await requestAudio("s1", "hoeren", "teil-1")).status, 409);
  assert.equal((await requestAudio("s1", "hoeren", "teil-2")).status, 200, "autre audio");
  assert.equal((await requestAudio("s2", "hoeren", "teil-1")).status, 200, "autre session");
});

test("échec de signature : l'émission réservée est rendue au candidat", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  auth.user = { id: "cand" };
  bucket.failNextSign = true;
  assert.equal((await requestAudio("s1")).status, 503);
  const row = await db.examSession.findUniqueOrThrow({ where: { id: "s1" } });
  assert.deepEqual(row.audioIssued, { "hoeren/teil-1": 0 });
  assert.equal((await requestAudio("s1")).status, 200);
  assert.equal((await requestAudio("s1")).status, 200);
  assert.equal((await requestAudio("s1")).status, 409, "la limite reste 2");
});

test("stockage non configuré : 503 et aucune émission consommée", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  auth.user = { id: "cand" };
  bucket.configured = false;
  assert.equal((await requestAudio("s1")).status, 503);
  const row = await db.examSession.findUniqueOrThrow({ where: { id: "s1" } });
  assert.deepEqual(row.audioIssued, {});
});

/* ───────────────────── Anciennes données / chemins douteux ───────────────────── */

test("ligne NON migrée (ancienne URL publique seule) : le chemin est déduit, URL signée émise", { skip: integrationSkip }, async () => {
  await seedExam({
    audioPath: null,
    audioUrl: "https://projet.supabase.co/storage/v1/object/public/audio/ancienne-piste.mp3",
  });
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  auth.user = { id: "cand" };
  const response = await requestAudio("s1");
  assert.equal(response.status, 200);
  assert.equal(bucket.signCalls[0].path, "ancienne-piste.mp3");
  assert.ok(!(await response.clone().json()).url.includes("/object/public/"));
});

test("démo gratuite (chemin statique de l'application) : servie telle quelle", { skip: integrationSkip }, async () => {
  await seedExam({ audioPath: null, audioUrl: "/audio/demo/hoeren-teil-1.wav" });
  await createUser(db, { id: "cand" });
  await seedSession("s1", "cand");
  auth.user = { id: "cand" };
  const body = await (await requestAudio("s1")).json();
  assert.equal(body.url, "/audio/demo/hoeren-teil-1.wav");
  assert.equal(body.kind, "static");
  assert.equal(bucket.signCalls.length, 0);
});

test("chemin stocké douteux (remontée de dossier, URL externe) : jamais signé", { skip: integrationSkip }, async () => {
  for (const bad of [{ audioPath: "../secret.mp3" }, { audioPath: "a/b.mp3" }, { audioUrl: "https://evil.example/x.mp3" }, { audioUrl: "//evil.example/x.mp3" }]) {
    await resetDatabase(db);
    await seedExam({ audioPath: null, audioUrl: null, ...bad });
    await createUser(db, { id: "cand" });
    await seedSession("s1", "cand");
    auth.user = { id: "cand" };
    assert.equal((await requestAudio("s1")).status, 404, JSON.stringify(bad));
  }
  assert.equal(bucket.signCalls.length, 0);
});

/* ───────────────────────── Administration ───────────────────────── */

test("aperçu admin : refusé aux candidats et anonymes, URL signée 10 min pour l'admin", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "cand" });
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  const request = () => previewRoute(jsonRequest("/api/admin/audio/preview?path=a.mp3", "GET"));

  assert.equal((await request()).status, 403);
  auth.user = { id: "cand", role: "STUDENT" };
  assert.equal((await request()).status, 403);
  // JWT « admin » mais rôle révoqué en base.
  auth.user = { id: "cand", role: "SUPER_ADMIN" };
  assert.equal((await request()).status, 403);
  assert.equal(bucket.signCalls.length, 0);

  auth.user = { id: "admin", role: "SUPER_ADMIN" };
  const ok = await request();
  assert.equal(ok.status, 200);
  assert.deepEqual(bucket.signCalls, [{ path: "a.mp3", ttl: 600 }]);

  const traversal = await previewRoute(jsonRequest("/api/admin/audio/preview?path=../x.mp3", "GET"));
  assert.equal(traversal.status, 400);
  assert.equal(bucket.signCalls.length, 1);
});

test("jeton d'upload : nom unique, upsert:false, aucune URL publique renvoyée", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  auth.user = { id: "admin", role: "SUPER_ADMIN" };
  const first = await (await signRoute(jsonRequest("/api/admin/audio/sign", "POST", { name: "piste.mp3" }))).json();
  const second = await (await signRoute(jsonRequest("/api/admin/audio/sign", "POST", { name: "piste.mp3" }))).json();
  assert.notEqual(first.path, second.path, "deux envois du même nom ne se remplacent pas");
  assert.ok(!JSON.stringify(first).includes("publicUrl") && !JSON.stringify(first).includes("/public/"));
});

test("rattachement : chemin sûr accepté ; URL publique, http et remontée de dossier refusées", { skip: integrationSkip }, async () => {
  await seedExam({ audioPath: null });
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  auth.user = { id: "admin", role: "SUPER_ADMIN" };
  const ctx = { params: Promise.resolve({ examId: "exam-h", sectionId: "hoeren", partId: "teil-1" }) };
  const patch = (body: unknown) => partRoute.PATCH(jsonRequest("/x", "PATCH", body), ctx);

  for (const bad of [
    { audioUrl: "https://projet.supabase.co/storage/v1/object/public/audio/x.mp3" },
    { audioUrl: "//evil.example/x.mp3" },
    { audioPath: "../x.mp3" },
    { audioPath: "a/b.mp3" },
    {},
  ]) {
    assert.equal((await patch(bad)).status, 400, JSON.stringify(bad));
  }
  assert.equal((await patch({ audioPath: "neu.mp3" })).status, 200);
  let part = await db.examPart.findFirstOrThrow({ where: { examId: "exam-h", partId: "teil-1" } });
  assert.equal(part.audioPath, "neu.mp3");
  assert.equal(part.audioUrl, null);

  assert.equal((await patch({ audioPath: null })).status, 200);
  part = await db.examPart.findFirstOrThrow({ where: { examId: "exam-h", partId: "teil-1" } });
  assert.equal(part.audioPath, null);
});

test("rattachement refusé aux non-admins", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand" });
  auth.user = { id: "cand", role: "STUDENT" };
  const ctx = { params: Promise.resolve({ examId: "exam-h", sectionId: "hoeren", partId: "teil-1" }) };
  assert.equal((await partRoute.PATCH(jsonRequest("/x", "PATCH", { audioPath: "x.mp3" }), ctx)).status, 403);
  const part = await db.examPart.findFirstOrThrow({ where: { examId: "exam-h", partId: "teil-1" } });
  assert.equal(part.audioPath, "piste-1.mp3");
});

test("édition du contenu (PUT) : n'altère ni ne détache JAMAIS l'audio", { skip: integrationSkip }, async () => {
  await seedExam({ audioPath: "piste-1.mp3", audioUrl: "https://projet.supabase.co/storage/v1/object/public/audio/piste-1.mp3" });
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  auth.user = { id: "admin", role: "SUPER_ADMIN" };
  const ctx = { params: Promise.resolve({ examId: "exam-h", sectionId: "hoeren", partId: "teil-1" }) };
  const response = await partRoute.PUT(
    jsonRequest("/x", "PUT", {
      type: "MULTIPLE_CHOICE",
      shared: { instructions: "Neu", audioUrl: "https://evil.example/x.mp3" },
      questions: [{ position: 1, points: 5, answerKey: "a", content: { question: "?", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }] } }],
    }),
    ctx,
  );
  assert.equal(response.status, 200);
  const part = await db.examPart.findFirstOrThrow({ where: { examId: "exam-h", partId: "teil-1" } });
  assert.equal(part.audioPath, "piste-1.mp3");
  assert.ok(part.audioUrl?.includes("/public/audio/piste-1.mp3"), "audioUrl historique intact");
  assert.ok(!JSON.stringify(part.sharedContent).includes("evil.example"));
});

/* ───────────────────────── Génération ───────────────────────── */

test("génération ElevenLabs : upsert:false, noms uniques, ancien audio jamais remplacé", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  auth.user = { id: "admin", role: "SUPER_ADMIN" };
  process.env.ELEVENLABS_API_KEY = "test-key";
  try {
    const generate = () =>
      generateRoute(jsonRequest("/api/admin/exams/generate", "POST", { seed: "meme-graine", level: "B2", withAudio: true }));
    const first = await generate();
    assert.equal(first.status, 201, await first.clone().text());
    const second = await generate();
    assert.equal(second.status, 201);
  } finally {
    delete process.env.ELEVENLABS_API_KEY;
  }

  assert.ok(bucket.uploads.length >= 6, "3 audios × 2 générations");
  assert.ok(bucket.uploads.every((upload) => upload.upsert === false), "aucune écriture avec upsert");
  const names = bucket.uploads.map((upload) => upload.path);
  assert.equal(new Set(names).size, names.length, "aucun nom réutilisé");
  const parts = await db.examPart.findMany({ where: { sectionId: "hoeren" } });
  for (const part of parts) {
    assert.ok(part.audioPath && names.includes(part.audioPath));
    assert.equal(part.audioUrl, null, "aucune URL publique enregistrée");
  }
  void DAY;
});

test("génération : si le fichier existe déjà côté stockage, l'écriture échoue sans rien remplacer", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  auth.user = { id: "admin", role: "SUPER_ADMIN" };
  process.env.ELEVENLABS_API_KEY = "test-key";
  bucket.failUpload = true;
  try {
    const response = await generateRoute(
      jsonRequest("/api/admin/exams/generate", "POST", { seed: "graine-x", level: "B2", withAudio: true }),
    );
    assert.equal(response.status, 201);
    assert.notEqual((await response.json()).audio.status, "done");
  } finally {
    delete process.env.ELEVENLABS_API_KEY;
  }
  const parts = await db.examPart.findMany({ where: { sectionId: "hoeren" } });
  assert.ok(parts.every((part) => part.audioPath === null && part.audioUrl === null));
});
