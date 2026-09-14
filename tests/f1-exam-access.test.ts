/**
 * F1 — Protection des examens payants (lib/exam-access.ts).
 *
 * Exécution (aucune dépendance ajoutée : runner intégré de Node + tsx) :
 *   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx \
 *     --experimental-test-module-mocks --test tests/*.test.ts
 *
 * La base et NextAuth sont remplacés par des doubles pilotés par `state` :
 * ces tests portent sur la LOGIQUE DE DÉCISION de la garde, pas sur Prisma.
 */
import { test, before, mock } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const DAY = 86_400_000;

const state = {
  authUserId: null as string | null,
  users: new Map<string, unknown>(),
  exams: new Map<string, { title: string }>(),
  sessions: new Map<string, unknown>(),
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
      user: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          state.users.get(where.id) ?? null,
      },
      exam: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          state.exams.get(where.id) ?? null,
      },
      examSession: {
        findUnique: async ({ where }: { where: { id: string } }) =>
          state.sessions.get(where.id) ?? null,
      },
    },
  },
});

type ExamAccess = typeof import("@/lib/exam-access");
let mod: ExamAccess;

// Titre réel de la copie éditable de la démo — importé, jamais deviné.
let DEMO_IMPORT_TITLE_VALUE = "";

before(async () => {
  mod = (await import("@/lib/exam-access")) as ExamAccess;
  DEMO_IMPORT_TITLE_VALUE = (await import("@/lib/exam-content")).DEMO_IMPORT_TITLE;
  // Catalogue : un examen payant publié, et la copie éditable de la démo.
  state.exams.set("exam-paid", { title: "Modelltest 2 — Payant" });
});

/** Réinitialise le monde entre deux cas. */
function reset() {
  state.authUserId = null;
  state.users.clear();
  state.sessions.clear();
}

function setUser(id: string, plan: string, expiresInDays: number | null) {
  state.users.set(id, {
    plan,
    planExpiresAt: expiresInDays === null ? null : new Date(Date.now() + expiresInDays * DAY),
    centerId: null,
    center: null,
  });
}

function setSession(
  id: string,
  userId: string,
  examId: string,
  extra: { startedAt?: Date | null; status?: string } = {},
) {
  state.sessions.set(id, {
    userId,
    examId,
    startedAt: extra.startedAt ?? null,
    status: extra.status ?? "AUDIO_CHECK",
  });
}

test("anonyme : aucun accès à une session, même existante", async () => {
  reset();
  setSession("s1", "u1", "exam-paid");
  assert.equal(await mod.requireSessionExam("s1"), null);
});

test("session appartenant à un AUTRE utilisateur : refus", async () => {
  reset();
  state.authUserId = "attaquant";
  setUser("attaquant", "PREMIUM", 30); // plan payant, mais pas sa session
  setSession("s1", "victime", "exam-paid");
  assert.equal(await mod.requireSessionExam("s1"), null);
});

test("FREE + examen payant : REFUS (faille F1)", async () => {
  reset();
  state.authUserId = "u-free";
  setUser("u-free", "FREE", null);
  setSession("s1", "u-free", "exam-paid");
  assert.equal(await mod.requireSessionExam("s1"), null);
  assert.equal(await mod.hasExamAccess("u-free", "exam-paid"), false);
});

test("STUDENT actif + examen payant : accès accordé", async () => {
  reset();
  state.authUserId = "u-paid";
  setUser("u-paid", "STUDENT", 30);
  setSession("s1", "u-paid", "exam-paid");
  const access = await mod.requireSessionExam("s1");
  assert.deepEqual(access, { userId: "u-paid", examId: "exam-paid" });
});

test("abonnement EXPIRÉ : retour au refus (rétrogradation FREE)", async () => {
  reset();
  state.authUserId = "u-exp";
  setUser("u-exp", "STUDENT", -1); // a expiré hier
  setSession("s1", "u-exp", "exam-paid");
  assert.equal(await mod.requireSessionExam("s1"), null);
});

test("FREE + démo (fixture) : gratuit, accès accordé", async () => {
  reset();
  assert.equal(await mod.isFreeExam("demo-b2"), true);
  assert.equal(await mod.hasExamAccess("u-free", "demo-b2"), true);
});

test("FREE + démo (copie éditable en base) : gratuit, accès accordé", async () => {
  reset();
  state.authUserId = "u-free";
  setUser("u-free", "FREE", null);
  state.exams.set("exam-demo-import", { title: DEMO_IMPORT_TITLE_VALUE });
  setSession("s1", "u-free", "exam-demo-import");
  const access = await mod.requireSessionExam("s1");
  assert.deepEqual(access, { userId: "u-free", examId: "exam-demo-import" });
});

test("cookie manipulé : aucun contournement — sans ligne en base, pas d'examen", async () => {
  reset();
  state.authUserId = "u-free";
  setUser("u-free", "FREE", null);
  // Aucune session en base. Avant le correctif, le cookie telc-exam-<id>
  // fournissait l'examId ; désormais la seule source est ExamSession.
  assert.equal(await mod.requireSessionExam("session-forgee"), null);
});

test("épreuve EN COURS : l'accès est maintenu même sans droit courant", async () => {
  reset();
  state.authUserId = "u-exp";
  setUser("u-exp", "STUDENT", -1); // abonnement expiré pendant l'épreuve
  setSession("s1", "u-exp", "exam-paid", {
    startedAt: new Date(Date.now() - 60_000),
    status: "IN_PROGRESS",
  });
  const access = await mod.requireSessionExam("s1");
  assert.deepEqual(access, { userId: "u-exp", examId: "exam-paid" });
});

test("régression : exam-content n'expose plus de résolution par cookie", async () => {
  const source = readFileSync("src/lib/exam-content.ts", "utf8");
  assert.ok(
    !/export async function resolveSessionExamId/.test(source),
    "resolveSessionExamId (lecture de cookie) ne doit pas réapparaître",
  );
  assert.ok(
    !/from "next\/headers"/.test(source),
    "exam-content ne doit plus lire de cookies",
  );
});
