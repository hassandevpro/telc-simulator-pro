/**
 * F2 — POST /api/sessions/score, désormais en LECTURE SEULE.
 *
 * La correction a lieu UNE fois, à la remise (POST /api/sessions/{id}/submit,
 * couvert par tests/int-sessions.test.ts sur PostgreSQL réel). Cette route ne
 * fait que relire le résultat STOCKÉ, et refuse tant que la session n'est pas
 * remise : ce n'est plus un oracle (corriger, changer une réponse, recorriger).
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

/** Résultat stocké par le serveur à la remise (sans aucune clé). */
const STORED_SCORE = { objectivePoints: 5, writtenMaxPoints: 225, parts: [] };

/** Session REMISE : statut SCORED et résultat calculé par le serveur. */
function seedScoredSession(owner: string) {
  state.sessions.set("s1", {
    userId: owner,
    status: "SCORED",
    result: { sectionScores: STORED_SCORE },
  });
}

/** Session démarrée, pas encore remise. */
function seedOpenSession(owner: string, status = "IN_PROGRESS") {
  state.sessions.set("s1", { userId: owner, status, result: null });
}

test("requête ANONYME : 401", async () => {
  state.authUserId = null;
  seedScoredSession("u1");
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
  seedScoredSession("victime");
  const response = await call({ sessionId: "s1" });
  assert.equal(response.status, 404);
});

for (const status of ["AUDIO_CHECK", "IN_PROGRESS", "EXPIRED", "SUBMITTED"]) {
  test(`session ${status} (non remise) : 409, aucune correction`, async () => {
    state.authUserId = "u1";
    seedOpenSession("u1", status);
    const response = await call({ sessionId: "s1" });
    assert.equal(response.status, 409);
    assert.equal((await response.json()).code, "NOT_SUBMITTED");
  });
}

test("session remise : 200, résultat STOCKÉ relu tel quel", async () => {
  state.authUserId = "u1";
  seedScoredSession("u1");
  const response = await call({ sessionId: "s1" });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), STORED_SCORE);
});

test("réponses / examId envoyés par le CLIENT : totalement ignorés", async () => {
  state.authUserId = "u1";
  seedScoredSession("u1");
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
  seedScoredSession("u1");
  const raw = await (await call({ sessionId: "s1" })).text();
  assert.ok(!raw.includes("KEY_SECRET"), "une clé de correction a fuité");
  assert.ok(!/"answerKey"/.test(raw));
});
