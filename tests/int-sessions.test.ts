/**
 * Sessions d'examen — crédits, transitions, remise, échéance (PostgreSQL réel).
 * Voir tests/helpers/pg.ts pour l'activation (TEST_DATABASE_URL).
 *
 * Chaque test attaque les VRAIS Route Handlers avec de vraies requêtes ;
 * seule l'authentification est simulée (identité choisie par le test).
 */
import { test, before, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import {
  DAY,
  createPaidExam,
  createUser,
  integrationSkip,
  jsonRequest,
  resetDatabase,
  selectTestDatabase,
} from "./helpers/pg";

selectTestDatabase();

const auth = { userId: null as string | null };
mock.module("@/lib/auth", {
  namedExports: {
    auth: async () => (auth.userId ? { user: { id: auth.userId } } : null),
  },
});

type Handler = (request: Request, ctx?: unknown) => Promise<Response>;
let db: typeof import("@/lib/db").db;
let saveRoute: Handler;
let sessionGet: Handler;
let sessionPatch: Handler;
let sessionDelete: Handler;
let submitRoute: Handler;
let scoreRoute: Handler;

const ctx = (sessionId: string) => ({ params: Promise.resolve({ sessionId }) });

before(async () => {
  if (integrationSkip) return;
  db = (await import("@/lib/db")).db;
  const sessions = await import("@/app/api/sessions/route");
  const one = await import("@/app/api/sessions/[sessionId]/route");
  const submit = await import("@/app/api/sessions/[sessionId]/submit/route");
  const score = await import("@/app/api/sessions/score/route");
  saveRoute = sessions.POST;
  sessionGet = one.GET as Handler;
  sessionPatch = one.PATCH as Handler;
  sessionDelete = one.DELETE as Handler;
  submitRoute = submit.POST as Handler;
  scoreRoute = score.POST;
});

after(async () => {
  if (!integrationSkip) await db.$disconnect();
});

let exam: Awaited<ReturnType<typeof createPaidExam>>;

beforeEach(async () => {
  if (integrationSkip) return;
  await resetDatabase(db);
  exam = await createPaidExam(db);
});

/* ───────────────────────────── Appels HTTP ───────────────────────────── */

const create = (sessionId: string, examId = exam.examId) =>
  saveRoute(
    jsonRequest("/api/sessions", "POST", {
      sessionId,
      examId,
      status: "AUDIO_CHECK",
      startedAt: null,
      answers: {},
      playedAudioIds: [],
    }),
  );

const start = (sessionId: string, extra: Record<string, unknown> = {}) =>
  saveRoute(
    jsonRequest("/api/sessions", "POST", {
      sessionId,
      examId: exam.examId,
      status: "IN_PROGRESS",
      startedAt: Date.now(),
      answers: {},
      playedAudioIds: [],
      ...extra,
    }),
  );

const patch = (sessionId: string, body: unknown) =>
  sessionPatch(jsonRequest(`/api/sessions/${sessionId}`, "PATCH", body), ctx(sessionId));

const answer = (sessionId: string, answers: Record<string, string | null>) =>
  patch(sessionId, { op: "answers", answers });

const submit = (sessionId: string) =>
  submitRoute(jsonRequest(`/api/sessions/${sessionId}/submit`, "POST"), ctx(sessionId));

const credits = async (id: string) =>
  (await db.user.findUniqueOrThrow({ where: { id } })).credits;

const sessionRow = (id: string) =>
  db.examSession.findUniqueOrThrow({ where: { id } });

async function startedSession(userId: string, sessionId: string) {
  auth.userId = userId;
  assert.equal((await create(sessionId)).status, 200);
  assert.equal((await start(sessionId)).status, 200);
}

/* ─────────────────────────────── Crédits ─────────────────────────────── */

test("1. zéro crédit : démarrage d'un examen payant refusé (402), rien n'est ouvert", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u0", credits: 0 });
  auth.userId = "u0";
  assert.equal((await create("s0")).status, 200);

  const response = await start("s0");
  assert.equal(response.status, 402);
  assert.equal((await response.json()).code, "NO_CREDITS");

  const row = await sessionRow("s0");
  assert.equal(row.status, "AUDIO_CHECK");
  assert.equal(row.startedAt, null);
  assert.equal(await credits("u0"), 0);
});

test("2. deux démarrages SIMULTANÉS avec un seul crédit : une seule session ouverte", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  auth.userId = "u1";
  for (const id of ["sa", "sb", "sc", "sd"]) assert.equal((await create(id)).status, 200);

  const responses = await Promise.all(["sa", "sb", "sc", "sd"].map((id) => start(id)));
  const statuses = responses.map((response) => response.status).sort();
  assert.deepEqual(statuses, [200, 402, 402, 402]);

  assert.equal(await credits("u1"), 0);
  const open = await db.examSession.count({ where: { userId: "u1", status: "IN_PROGRESS" } });
  assert.equal(open, 1);
  // Les démarrages refusés sont ANNULÉS : pas d'ancre de timer posée.
  const anchored = await db.examSession.count({ where: { userId: "u1", startedAt: { not: null } } });
  assert.equal(anchored, 1);
});

test("2b. même session démarrée deux fois en parallèle : un seul débit", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 3 });
  auth.userId = "u1";
  await create("s1");
  const responses = await Promise.all([start("s1"), start("s1"), start("s1")]);
  assert.deepEqual(responses.map((response) => response.status), [200, 200, 200]);
  assert.equal(await credits("u1"), 2);
  assert.equal((await sessionRow("s1")).creditStatus, "CHARGED");
});

test("le débit a lieu au DÉMARRAGE (et non à la remise) ; rejouer un examen fait est gratuit", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 2 });
  await startedSession("u1", "s1");
  assert.equal(await credits("u1"), 1);
  assert.equal((await submit("s1")).status, 200);
  assert.equal(await credits("u1"), 1, "la remise ne débite pas une 2e fois");

  await startedSession("u1", "s2");
  assert.equal(await credits("u1"), 1, "rejeu d'un examen déjà terminé : gratuit");
  assert.equal((await sessionRow("s2")).creditStatus, "EXEMPT");
});

test("startedAt envoyé par le client (dans le futur) : ignoré, l'heure serveur fait foi", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  auth.userId = "u1";
  await create("s1");
  const before = Date.now();
  await start("s1", { startedAt: Date.now() + 30 * DAY });
  const startedAt = (await sessionRow("s1")).startedAt!.getTime();
  assert.ok(startedAt >= before - 1000 && startedAt <= Date.now() + 1000);
});

test("plan expiré entre la création et le démarrage : démarrage refusé (403)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 5 });
  auth.userId = "u1";
  await create("s1");
  await db.user.update({ where: { id: "u1" }, data: { planExpiresAt: new Date(Date.now() - DAY) } });
  assert.equal((await start("s1")).status, 403);
  assert.equal(await credits("u1"), 5);
});

/* ────────────────────────── Remise et correction ─────────────────────── */

test("3. correction AVANT remise refusée : /score renvoie 409 tant que la session n'est pas remise", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  await startedSession("u1", "s1");
  await answer("s1", { [exam.q1]: "KEY_SECRET_ALPHA" });

  const response = await scoreRoute(jsonRequest("/api/sessions/score", "POST", { sessionId: "s1" }));
  assert.equal(response.status, 409);
  const text = await response.text();
  assert.ok(!text.includes("KEY_SECRET"), "aucune clé ne fuit");
  assert.equal(await db.result.count(), 0);
});

test("3b. remise d'une session non démarrée : 409", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  auth.userId = "u1";
  await create("s1");
  const response = await submit("s1");
  assert.equal(response.status, 409);
  assert.equal((await response.json()).code, "NOT_STARTED");
});

test("remise : correction serveur des réponses PERSISTÉES, une seule fois", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  await startedSession("u1", "s1");
  assert.equal((await answer("s1", { [exam.q1]: "KEY_SECRET_ALPHA", [exam.q2]: "faux" })).status, 200);

  const responses = await Promise.all([submit("s1"), submit("s1"), submit("s1")]);
  const bodies = await Promise.all(responses.map((response) => response.text()));
  for (const [index, response] of responses.entries()) {
    assert.equal(response.status, 200);
    assert.ok(!bodies[index].includes("KEY_SECRET"));
    assert.equal(JSON.parse(bodies[index]).objectivePoints, 5);
  }
  assert.equal(await db.result.count({ where: { sessionId: "s1" } }), 1);
  assert.equal((await sessionRow("s1")).status, "SCORED");

  // Après remise, /score relit le résultat stocké.
  const read = await scoreRoute(jsonRequest("/api/sessions/score", "POST", { sessionId: "s1" }));
  assert.equal(read.status, 200);
  assert.equal((await read.json()).objectivePoints, 5);
});

test("4. réponses IMMUABLES après remise (PATCH et POST refusés, base inchangée)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  await startedSession("u1", "s1");
  await answer("s1", { [exam.q1]: "faux" });
  await submit("s1");

  const viaPatch = await answer("s1", { [exam.q1]: "KEY_SECRET_ALPHA" });
  assert.equal(viaPatch.status, 409);
  const viaPost = await saveRoute(
    jsonRequest("/api/sessions", "POST", {
      sessionId: "s1",
      examId: exam.examId,
      status: "SCORED",
      startedAt: Date.now(),
      answers: { [exam.q1]: "KEY_SECRET_ALPHA" },
      playedAudioIds: [],
    }),
  );
  assert.equal(viaPost.status, 409);

  const stored = await db.answer.findUniqueOrThrow({
    where: { sessionId_questionId: { sessionId: "s1", questionId: exam.q1 } },
  });
  assert.equal(stored.value, "faux");
  // Une 2e remise ne recorrige pas.
  assert.equal((await (await submit("s1")).json()).objectivePoints, 0);
});

test("remise et sauvegarde CONCURRENTES : une réponse acceptée est toujours corrigée", { skip: integrationSkip }, async () => {
  for (let round = 0; round < 5; round += 1) {
    await resetDatabase(db);
    exam = await createPaidExam(db);
    await createUser(db, { id: "u1", credits: 1 });
    await startedSession("u1", "s1");

    const [saved, submitted] = await Promise.all([
      answer("s1", { [exam.q1]: "KEY_SECRET_ALPHA" }),
      submit("s1"),
    ]);
    assert.equal(submitted.status, 200);
    const points = (await submitted.json()).objectivePoints;
    if (saved.status === 200) assert.equal(points, 5, "réponse acceptée mais non corrigée");
    else {
      assert.equal(saved.status, 409);
      assert.equal(points, 0);
    }
  }
});

test("5. score falsifié par le client : refusé, jamais stocké", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  await startedSession("u1", "s1");

  const forged = await saveRoute(
    jsonRequest("/api/sessions", "POST", {
      sessionId: "s1",
      examId: exam.examId,
      status: "SCORED",
      startedAt: Date.now(),
      submittedAt: Date.now(),
      answers: {},
      playedAudioIds: [],
      result: { objectivePoints: 999, writtenMaxPoints: 225 },
    }),
  );
  assert.equal(forged.status, 409);
  assert.equal(await db.result.count(), 0);

  // Même statut demandé, sans transition : le résultat fourni est ignoré.
  const ignored = await saveRoute(
    jsonRequest("/api/sessions", "POST", {
      sessionId: "s1",
      examId: exam.examId,
      status: "IN_PROGRESS",
      startedAt: Date.now(),
      answers: {},
      playedAudioIds: [],
      result: { objectivePoints: 999 },
    }),
  );
  assert.equal(ignored.status, 200);
  assert.equal(await db.result.count(), 0);

  for (const status of ["SUBMITTED", "SCORED"]) {
    const response = await patch("s1", { op: "status", status });
    assert.equal(response.status, 409, `PATCH ${status}`);
  }
  assert.equal((await sessionRow("s1")).status, "IN_PROGRESS");
});

/* ─────────────────────────── Échéance serveur ────────────────────────── */

test("6. session expirée : jamais réactivée (POST et PATCH IN_PROGRESS refusés)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 2 });
  await startedSession("u1", "s1");
  assert.equal((await patch("s1", { op: "status", status: "EXPIRED" })).status, 200);

  assert.equal((await start("s1")).status, 409);
  assert.equal((await patch("s1", { op: "status", status: "IN_PROGRESS" })).status, 409);
  assert.equal((await answer("s1", { [exam.q1]: "x" })).status, 409);
  assert.equal((await sessionRow("s1")).status, "EXPIRED");
  assert.equal(await credits("u1"), 1, "aucun nouveau débit");

  // Une session expirée peut toujours être REMISE (on corrige l'enregistré).
  assert.equal((await submit("s1")).status, 200);
});

test("6b. durée appliquée côté SERVEUR : réponses refusées après l'échéance, statut fermé", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  await startedSession("u1", "s1");
  // B2 = 140 min ; on recule l'ancre au-delà de l'échéance + marge.
  await db.examSession.update({
    where: { id: "s1" },
    data: { startedAt: new Date(Date.now() - 142 * 60_000) },
  });

  const late = await answer("s1", { [exam.q1]: "KEY_SECRET_ALPHA" });
  assert.equal(late.status, 409);
  assert.equal((await late.json()).code, "SESSION_EXPIRED");
  assert.equal((await sessionRow("s1")).status, "EXPIRED");
  assert.equal(await db.answer.count(), 0);

  const state = await (await sessionGet(jsonRequest("/api/sessions/s1", "GET"), ctx("s1"))).json();
  assert.equal(state.status, "EXPIRED");
});

test("6c. dans la marge réseau (échéance dépassée de 30 s) : réponse encore acceptée", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  await startedSession("u1", "s1");
  await db.examSession.update({
    where: { id: "s1" },
    data: { startedAt: new Date(Date.now() - (140 * 60 + 30) * 1000) },
  });
  assert.equal((await answer("s1", { [exam.q1]: "a" })).status, 200);
});

/* ─────────────────────────── Propriété des sessions ──────────────────── */

test("7. sessions d'un AUTRE utilisateur : inaccessibles par toutes les routes", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "victime", credits: 1 });
  await createUser(db, { id: "attaquant", credits: 5 });
  await startedSession("victime", "sv");
  await answer("sv", { [exam.q1]: "secret-de-la-victime" });

  auth.userId = "attaquant";
  assert.equal((await sessionGet(jsonRequest("/api/sessions/sv", "GET"), ctx("sv"))).status, 404);
  assert.equal((await answer("sv", { [exam.q1]: "sabotage" })).status, 404);
  assert.equal((await patch("sv", { op: "status", status: "EXPIRED" })).status, 404);
  assert.equal((await submit("sv")).status, 404);
  assert.equal(
    (await scoreRoute(jsonRequest("/api/sessions/score", "POST", { sessionId: "sv" }))).status,
    404,
  );
  assert.equal((await start("sv")).status, 403);
  assert.equal((await sessionDelete(jsonRequest("/api/sessions/sv", "DELETE"), ctx("sv"))).status, 404);

  const row = await sessionRow("sv");
  assert.equal(row.status, "IN_PROGRESS");
  assert.equal(await credits("attaquant"), 5);
  const stored = await db.answer.findFirstOrThrow({ where: { sessionId: "sv" } });
  assert.equal(stored.value, "secret-de-la-victime");
});

test("anonyme : 401 sur toutes les routes de session", { skip: integrationSkip }, async () => {
  auth.userId = null;
  assert.equal((await create("sx")).status, 401);
  assert.equal((await answer("sx", {})).status, 401);
  assert.equal((await submit("sx")).status, 401);
});

/* ───────────────────────── Intégrité des réponses ────────────────────── */

test("question étrangère à l'examen : ignorée et signalée, jamais stockée", { skip: integrationSkip }, async () => {
  const other = await createPaidExam(db, "exam-other");
  await createUser(db, { id: "u1", credits: 1 });
  await startedSession("u1", "s1");

  const response = await answer("s1", { [exam.q1]: "a", [other.q1]: "b", inexistante: "c" });
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.saved, 1);
  assert.deepEqual(body.rejected.sort(), [other.q1, "inexistante"].sort());
  assert.equal(await db.answer.count(), 1);
});

test("audios consommés : un save ne peut pas les effacer (union)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 1 });
  await startedSession("u1", "s1");
  await patch("s1", { op: "audio", audioId: "hoeren/teil-1" });
  await saveRoute(
    jsonRequest("/api/sessions", "POST", {
      sessionId: "s1",
      examId: exam.examId,
      status: "IN_PROGRESS",
      startedAt: Date.now(),
      answers: {},
      playedAudioIds: [],
    }),
  );
  assert.deepEqual((await sessionRow("s1")).audioPlayed, ["hoeren/teil-1"]);
});

/* ──────────────────────── Sessions historiques ───────────────────────── */

test("session HISTORIQUE (démarrée avant la migration) : l'ancien débit s'applique à la remise", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", credits: 2 });
  await db.examSession.create({
    data: {
      id: "legacy",
      userId: "u1",
      examId: exam.examId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      creditStatus: null,
    },
  });
  auth.userId = "u1";
  assert.equal((await submit("legacy")).status, 200);
  assert.equal(await credits("u1"), 1);
  assert.equal((await sessionRow("legacy")).creditStatus, "CHARGED_AT_SUBMIT");
  // Une 2e remise ne redébite pas.
  await submit("legacy");
  assert.equal(await credits("u1"), 1);
});
