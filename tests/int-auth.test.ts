/**
 * Inscription, vérification d'e-mail, autorisations admin (PostgreSQL réel).
 * Voir tests/helpers/pg.ts pour l'activation (TEST_DATABASE_URL).
 */
import { test, before, beforeEach, after, mock } from "node:test";
import assert from "node:assert/strict";
import {
  createUser,
  integrationSkip,
  resetDatabase,
  selectTestDatabase,
} from "./helpers/pg";

selectTestDatabase();

const auth = { user: null as { id: string; role?: string } | null };
mock.module("@/lib/auth", {
  namedExports: { auth: async () => (auth.user ? { user: auth.user } : null) },
});

/** Liens de vérification « envoyés » (aucun e-mail réel). */
const sentLinks: string[] = [];
mock.module("@/lib/email", {
  namedExports: {
    sendVerificationEmail: async (_to: string, url: string) => {
      sentLinks.push(url);
    },
  },
});

let db: typeof import("@/lib/db").db;
let register: (request: Request) => Promise<Response>;
let verify: (request: Request) => Promise<Response>;
let adminUsers: () => Promise<Response>;
let adminUserPatch: (request: Request, ctx: unknown) => Promise<Response>;
let resetRateLimits: () => void;

before(async () => {
  if (integrationSkip) return;
  db = (await import("@/lib/db")).db;
  register = (await import("@/app/api/auth/register/route")).POST;
  verify = (await import("@/app/api/auth/verify/route")).GET;
  adminUsers = (await import("@/app/api/admin/users/route")).GET;
  adminUserPatch = (await import("@/app/api/admin/users/[userId]/route")).PATCH as never;
  resetRateLimits = (await import("@/lib/rate-limit")).resetRateLimits;
});

after(async () => {
  if (!integrationSkip) await db.$disconnect();
});

beforeEach(async () => {
  if (integrationSkip) return;
  await resetDatabase(db);
  resetRateLimits();
  sentLinks.length = 0;
  auth.user = null;
  delete process.env.EMAIL_VERIFICATION_REQUIRED;
});

const registerRequest = (email: string, ip = "203.0.113.7") =>
  new Request("http://localhost/api/auth/register", {
    method: "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": ip },
    body: JSON.stringify({ name: "Test", email, password: "motdepasse-long", phone: "+237 699 12 34 56" }),
  });

/* ─────────────────────────────── Inscription ─────────────────────────── */

test("inscription : le compte n'est PLUS marqué vérifié d'office ; un lien est envoyé", { skip: integrationSkip }, async () => {
  assert.equal((await register(registerRequest("neu@test.local"))).status, 201);
  const user = await db.user.findUniqueOrThrow({ where: { email: "neu@test.local" } });
  assert.equal(user.emailVerified, null);
  assert.equal(user.emailVerifiedBy, null);
  assert.equal(sentLinks.length, 1);

  // Le lien prouve la possession de l'adresse → liaison Google possible.
  const response = await verify(new Request(sentLinks[0]));
  assert.equal(response.status, 307);
  const verified = await db.user.findUniqueOrThrow({ where: { email: "neu@test.local" } });
  assert.equal(verified.emailVerifiedBy, "LINK");
  assert.ok(verified.emailVerified);
});

test("inscription : limitation de débit par IP (6e tentative / heure → 429)", { skip: integrationSkip }, async () => {
  const statuses: number[] = [];
  for (let index = 0; index < 6; index += 1) {
    statuses.push((await register(registerRequest(`r${index}@test.local`))).status);
  }
  assert.deepEqual(statuses, [201, 201, 201, 201, 201, 429]);
  // Une autre IP n'est pas pénalisée.
  assert.equal((await register(registerRequest("autre@test.local", "198.51.100.1"))).status, 201);
});

test("adresse déjà inscrite, vérification OBLIGATOIRE : réponse identique à une création", { skip: integrationSkip }, async () => {
  process.env.EMAIL_VERIFICATION_REQUIRED = "true";
  await createUser(db, { id: "existant" });
  const fresh = await register(registerRequest("frais@test.local"));
  const dup = await register(registerRequest("existant@test.local"));
  assert.equal(dup.status, fresh.status);
  assert.deepEqual(await dup.json(), await fresh.json());
  assert.equal(await db.user.count({ where: { email: "existant@test.local" } }), 1);
});

test("adresse déjà inscrite, vérification FACULTATIVE : 409 (connexion immédiate oblige)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "existant" });
  assert.equal((await register(registerRequest("existant@test.local"))).status, 409);
});

/* ─────────────────────── 9. Rôle administrateur révoqué ──────────────── */

test("9. administrateur RÉTROGRADÉ en base : routes admin refusées malgré un JWT « SUPER_ADMIN »", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  auth.user = { id: "admin", role: "SUPER_ADMIN" };
  assert.equal((await adminUsers()).status, 200);

  await db.user.update({ where: { id: "admin" }, data: { role: "STUDENT" } });
  // Le JWT dit toujours SUPER_ADMIN : la garde relit la base.
  assert.equal((await adminUsers()).status, 403);
  const escalation = await adminUserPatch(
    new Request("http://localhost/api/admin/users/admin", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ role: "SUPER_ADMIN" }),
    }),
    { params: Promise.resolve({ userId: "admin" }) },
  );
  assert.equal(escalation.status, 403);
  assert.equal((await db.user.findUniqueOrThrow({ where: { id: "admin" } })).role, "STUDENT");
});

test("9. administrateur SUPPRIMÉ : routes admin refusées", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  auth.user = { id: "admin", role: "SUPER_ADMIN" };
  await db.user.delete({ where: { id: "admin" } });
  assert.equal((await adminUsers()).status, 403);
});
