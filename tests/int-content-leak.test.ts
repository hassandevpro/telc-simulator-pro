/**
 * Fuite de la transcription Hören (PostgreSQL réel) : on cherche la valeur
 * sentinelle dans TOUT ce qu'un candidat peut recevoir — contenu des
 * services, arbre de composants des pages d'examen (HTML initial et
 * propriétés des composants clients), routes API.
 * Voir tests/helpers/pg.ts pour l'activation (TEST_DATABASE_URL).
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

const TRANSCRIPT = "TRANSCRIPT_SECRET_SENTINEL";
const AUDIO_URL =
  "https://projet.supabase.co/storage/v1/object/public/audio/AUDIO_LOCATION_SENTINEL.mp3";

let db: typeof import("@/lib/db").db;
let content: typeof import("@/lib/exam-content");

before(async () => {
  if (integrationSkip) return;
  db = (await import("@/lib/db")).db;
  content = await import("@/lib/exam-content");
});

after(async () => {
  if (!integrationSkip) await db.$disconnect();
});

beforeEach(async () => {
  if (integrationSkip) return;
  await resetDatabase(db);
  auth.user = null;
});

/** Examen Hören + Lesen : script, URL audio et champ inconnu dans le JSON stocké. */
async function seedExam() {
  await db.exam.create({
    data: {
      id: "exam-h",
      title: "Modelltest H",
      level: "B2",
      isPublished: true,
      parts: {
        create: [
          {
            sectionId: "hoeren",
            partId: "teil-1",
            sharedContent: {
              instructions: "Hören Sie.",
              script: { text: `${TRANSCRIPT} Die Antwort ist B.`, speakers: ["A"], targetSeconds: 60 },
              hint: "HINT_SENTINEL",
            },
            audioUrl: AUDIO_URL,
            questions: {
              create: [
                {
                  id: "h1",
                  position: 1,
                  type: "MULTIPLE_CHOICE",
                  content: { question: "Frage?", options: [{ id: "a", text: "A" }, { id: "b", text: "B" }], script: TRANSCRIPT },
                  answerKey: "KEY_SENTINEL",
                  points: 5,
                },
              ],
            },
          },
        ],
      },
    },
  });
}

function assertClean(value: unknown, label: string) {
  const out = typeof value === "string" ? value : JSON.stringify(value);
  for (const secret of [TRANSCRIPT, "AUDIO_LOCATION_SENTINEL", "HINT_SENTINEL", "KEY_SENTINEL"]) {
    assert.ok(!out.includes(secret), `${secret} fuit dans : ${label}`);
  }
}

/** Sérialise un arbre React (props comprises), sans `_owner`/`_store` internes. */
function serializeTree(node: unknown): string {
  return JSON.stringify(node, (key, value) =>
    key === "_owner" || key === "_store" ? undefined : value,
  );
}

test("service de contenu : getExamContent et getPartContent ne portent aucun secret", { skip: integrationSkip }, async () => {
  await seedExam();
  const bundle = await content.getExamContent("exam-h");
  assertClean(bundle, "getExamContent");
  const part = await content.getPartContent("exam-h", "hoeren", "teil-1");
  assertClean(part, "getPartContent");
  assert.equal((part?.shared as { hasAudio?: boolean }).hasAudio, true);
  assert.equal(part?.questions[0].content && "options" in part.questions[0].content, true);
});

test("démo codée en dur (fixture) : aucun emplacement audio ne sort du service", { skip: integrationSkip }, async () => {
  const part = await content.getPartContent("demo-b2", "hoeren", "teil-1");
  assert.ok(part);
  assert.ok(!JSON.stringify(part).includes("/audio/demo/"));
  assert.equal((part.shared as { hasAudio?: boolean }).hasAudio, true);
});

test("page d'examen (arbre de composants rendu côté serveur) : aucune transcription", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand", credits: 3 });
  await db.examSession.create({
    data: { id: "s1", userId: "cand", examId: "exam-h", status: "IN_PROGRESS", startedAt: new Date() },
  });
  auth.user = { id: "cand" };

  const { TeilPage } = await import("@/components/exam/TeilPage");
  const tree = await TeilPage({ sessionId: "s1", sectionId: "hoeren", teil: "teil-1" });
  const serialized = serializeTree(tree);
  assert.ok(serialized.includes("Frage?"), "la page doit bien contenir la question");
  assert.ok(!serialized.includes(TRANSCRIPT), "transcription dans les propriétés des composants");
  assert.ok(!serialized.includes("HINT_SENTINEL"));
  assert.ok(!serialized.includes("KEY_SENTINEL"));
});

test("page de remise (abgabe) : aucune transcription", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand", credits: 3 });
  await db.examSession.create({
    data: { id: "s1", userId: "cand", examId: "exam-h", status: "IN_PROGRESS", startedAt: new Date() },
  });
  auth.user = { id: "cand" };
  const page = (await import("@/app/(exam)/session/[sessionId]/abgabe/page")).default;
  assertClean(serializeTree(await page({ params: Promise.resolve({ sessionId: "s1" }) })), "abgabe");
});

test("routes API accessibles au candidat : session, historique, correction, admin", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "cand", credits: 3 });
  await db.examSession.create({
    data: { id: "s1", userId: "cand", examId: "exam-h", status: "IN_PROGRESS", startedAt: new Date() },
  });
  auth.user = { id: "cand", role: "STUDENT" };
  const ctx = { params: Promise.resolve({ sessionId: "s1" }) };

  const one = await import("@/app/api/sessions/[sessionId]/route");
  assertClean(await (await one.GET(jsonRequest("/api/sessions/s1", "GET"), ctx)).text(), "GET /api/sessions/{id}");
  const list = await import("@/app/api/sessions/route");
  assertClean(await (await list.GET()).text(), "GET /api/sessions");
  const score = await import("@/app/api/sessions/score/route");
  assertClean(
    await (await score.POST(jsonRequest("/api/sessions/score", "POST", { sessionId: "s1" }))).text(),
    "POST /api/sessions/score",
  );

  // La seule route qui expose le script est l'administration : refusée au candidat.
  const adminPart = await import("@/app/api/admin/exams/[examId]/parts/[sectionId]/[partId]/route");
  const forbidden = await adminPart.GET(jsonRequest("/x", "GET"), {
    params: Promise.resolve({ examId: "exam-h", sectionId: "hoeren", partId: "teil-1" }),
  });
  assert.equal(forbidden.status, 403);
  assertClean(await forbidden.text(), "GET admin part (candidat)");
});

test("l'administration autorisée CONSERVE le script (édition, génération manuelle de l'audio)", { skip: integrationSkip }, async () => {
  await seedExam();
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  auth.user = { id: "admin", role: "SUPER_ADMIN" };
  const adminPart = await import("@/app/api/admin/exams/[examId]/parts/[sectionId]/[partId]/route");
  const response = await adminPart.GET(jsonRequest("/x", "GET"), {
    params: Promise.resolve({ examId: "exam-h", sectionId: "hoeren", partId: "teil-1" }),
  });
  assert.equal(response.status, 200);
  const body = await response.text();
  assert.ok(body.includes(TRANSCRIPT), "l'admin doit pouvoir relire le script");
  assert.ok(body.includes("KEY_SENTINEL"), "et le corrigé (inchangé)");
  void DAY;
});
