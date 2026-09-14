/**
 * F2 — Sécurisation de POST /api/sessions/score.
 *
 * Exécution :
 *   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx \
 *     --experimental-test-module-mocks --test tests/*.test.ts
 *
 * Les clés de correction portent une valeur SENTINELLE ("KEY_SECRET_*") :
 * on peut ainsi vérifier par simple recherche de sous-chaîne qu'aucune clé
 * ne redescend dans la réponse HTTP.
 */
import { test, before, mock } from "node:test";
import assert from "node:assert/strict";

const state = {
  authUserId: null as string | null,
  sessions: new Map<string, unknown>(),
};

/** Examen à corriger : 2 items de 5 points, clés sentinelles. */
const EXAM = {
  id: "exam-paid",
  parts: [
    {
      sectionId: "lesen",
      partId: "teil-1",
      questions: [
        { id: "q1", position: 1, content: {}, answerKey: "KEY_SECRET_ALPHA", points: 5 },
        { id: "q2", position: 2, content: {}, answerKey: "KEY_SECRET_BETA", points: 5 },
      ],
    },
  ],
};

mock.module("@/lib/auth", {
  namedExports: {
    auth: async () =>
      state.authUserId ? { user: { id: state.authUserId } } : null,
  },
});

mock.module("@/lib/db", {
  namedExports: {
    db: {
      exam: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          where.id === EXAM.id ? EXAM : null,
        findFirst: async () => null,
      },
      examSession: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          state.sessions.get(where.id) ?? null,
      },
    },
  },
});

let POST: (request: Request) => Promise<Response>;

before(async () => {
  POST = (await import("@/app/api/sessions/score/route")).POST;
});

function call(body: unknown): Promise<Response> {
  return POST(
    new Request("http://localhost/api/sessions/score", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }),
  );
}

/** Session prête à être corrigée : une bonne réponse, une mauvaise → 5 pts. */
function seedScorableSession(owner: string) {
  state.sessions.set("s1", {
    userId: owner,
    examId: EXAM.id,
    status: "SUBMITTED",
    startedAt: new Date(Date.now() - 3_600_000),
    exam: { level: "B2" },
    answers: [
      { questionId: "q1", value: "KEY_SECRET_ALPHA" }, // juste
      { questionId: "q2", value: "mauvaise" }, // faux
    ],
  });
}

test("requête ANONYME : 401 (l'oracle sur le corrigé est fermé)", async () => {
  state.authUserId = null;
  seedScorableSession("u1");
  const response = await call({ sessionId: "s1" });
  assert.equal(response.status, 401);
});

test("payload invalide : 400", async () => {
  state.authUserId = "u1";
  const response = await call({ pasDeSessionId: true });
  assert.equal(response.status, 400);
});

test("session inexistante : 404", async () => {
  state.authUserId = "u1";
  state.sessions.clear();
  const response = await call({ sessionId: "inconnue" });
  assert.equal(response.status, 404);
});

test("session d'un AUTRE utilisateur : 404 (sans révéler son existence)", async () => {
  state.authUserId = "attaquant";
  seedScorableSession("victime");
  const response = await call({ sessionId: "s1" });
  assert.equal(response.status, 404);
});

test("session pas encore commencée : 409", async () => {
  state.authUserId = "u1";
  state.sessions.set("s1", {
    userId: "u1",
    examId: EXAM.id,
    status: "AUDIO_CHECK",
    startedAt: null,
    exam: { level: "B2" },
    answers: [],
  });
  const response = await call({ sessionId: "s1" });
  assert.equal(response.status, 409);
});

test("utilisateur autorisé : 200 et score calculé sur les réponses EN BASE", async () => {
  state.authUserId = "u1";
  seedScorableSession("u1");
  const response = await call({ sessionId: "s1" });
  assert.equal(response.status, 200);
  const score = (await response.json()) as { objectivePoints: number };
  assert.equal(score.objectivePoints, 5); // 1 bonne sur 2
});

test("réponses envoyées par le CLIENT : totalement ignorées", async () => {
  state.authUserId = "u1";
  seedScorableSession("u1");
  // Le client prétend avoir tout bon, et vise un autre examen.
  const response = await call({
    sessionId: "s1",
    examId: "un-autre-examen",
    answers: { q1: "KEY_SECRET_ALPHA", q2: "KEY_SECRET_BETA" },
  });
  assert.equal(response.status, 200);
  const score = (await response.json()) as { objectivePoints: number };
  assert.equal(score.objectivePoints, 5, "le score doit rester celui de la base");
});

test("aucune clé de correction dans la réponse HTTP", async () => {
  state.authUserId = "u1";
  seedScorableSession("u1");
  const response = await call({ sessionId: "s1" });
  const raw = await response.text();
  assert.ok(!raw.includes("KEY_SECRET"), "une clé de correction a fuité");
  assert.ok(!/"answerKey"/.test(raw));
  assert.ok(!/"key"/.test(raw));
});
