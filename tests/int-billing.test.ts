/**
 * Abonnements, sièges de centre, idempotence des paiements (PostgreSQL réel).
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

const auth = { userId: null as string | null };
mock.module("@/lib/auth", {
  namedExports: {
    auth: async () => (auth.userId ? { user: { id: auth.userId } } : null),
  },
});

let db: typeof import("@/lib/db").db;
let billing: typeof import("@/lib/billing");
let seats: typeof import("@/lib/center-seats");
let joinRoute: (request: Request) => Promise<Response>;

before(async () => {
  if (integrationSkip) return;
  db = (await import("@/lib/db")).db;
  billing = await import("@/lib/billing");
  seats = await import("@/lib/center-seats");
  joinRoute = (await import("@/app/api/center/join/route")).POST;
});

after(async () => {
  if (!integrationSkip) await db.$disconnect();
});

beforeEach(async () => {
  if (!integrationSkip) await resetDatabase(db);
});

let refCounter = 0;
async function pendingPayment(
  userId: string,
  plan: "STUDENT" | "PREMIUM" | "CENTER",
  seatCount: number | null = null,
) {
  const providerRef = `ref-${(refCounter += 1)}`;
  await db.payment.create({
    data: {
      userId,
      provider: "STRIPE",
      providerRef,
      plan,
      seats: seatCount,
      amount: 1,
      currency: "EUR",
      status: "PENDING",
    },
  });
  return providerRef;
}

const user = (id: string) => db.user.findUniqueOrThrow({ where: { id } });
const daysFromNow = (date: Date | null) =>
  date ? Math.round((date.getTime() - Date.now()) / DAY) : null;

/* ─────────────────────────── Sièges datés ────────────────────────────── */

test("sièges expirés : un renouvellement à 1 siège ne garde pas les 100 anciens", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "FREE", planExpiresAt: null });
  await billing.activatePlanByRef(await pendingPayment("owner", "CENTER", 100));
  const center = await db.center.findUniqueOrThrow({ where: { ownerId: "owner" } });
  assert.equal(await seats.activeSeats(db, center.id), 100);

  // Un mois plus tard : la dotation de 100 a expiré, on renouvelle 1 siège.
  await db.centerSeatGrant.updateMany({
    where: { centerId: center.id },
    data: { startsAt: new Date(Date.now() - 40 * DAY), expiresAt: new Date(Date.now() - 10 * DAY) },
  });
  await billing.activatePlanByRef(await pendingPayment("owner", "CENTER", 1));
  assert.equal(await seats.activeSeats(db, center.id), 1);
  assert.equal((await db.center.findUniqueOrThrow({ where: { id: center.id } })).seats, 0,
    "le compteur historique n'est plus incrémenté");
});

test("membres au-delà des sièges actifs : seuls les plus anciens gardent l'accès", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "FREE", planExpiresAt: null, credits: 0 });
  await billing.activatePlanByRef(await pendingPayment("owner", "CENTER", 1));
  const center = await db.center.findUniqueOrThrow({ where: { ownerId: "owner" } });

  for (const [index, id] of ["m1", "m2", "m3"].entries()) {
    await createUser(db, {
      id,
      plan: "FREE",
      planExpiresAt: null,
      credits: 0,
      centerId: center.id,
      centerJoinedAt: new Date(Date.now() - (10 - index) * DAY),
    });
  }
  assert.equal(await billing.getEffectivePlanForUser("m1"), "STUDENT");
  assert.equal(await billing.getEffectivePlanForUser("m2"), "FREE");
  assert.equal(await billing.getEffectivePlanForUser("m3"), "FREE");

  // Pool de crédits : seul le membre avec siège consomme le pool du centre.
  assert.equal(await seats.creditAccountFor(db, "m1"), "owner");
  assert.equal(await seats.creditAccountFor(db, "m2"), "m2");

  // Les sièges expirent : plus personne n'a accès via le centre.
  await db.centerSeatGrant.updateMany({
    where: { centerId: center.id },
    data: { expiresAt: new Date(Date.now() - 1000) },
  });
  assert.equal(await billing.getEffectivePlanForUser("m1"), "FREE");
});

test("adhésions SIMULTANÉES pour la dernière place : une seule passe", { skip: integrationSkip }, async () => {
  // Plusieurs tours, 20 candidats chacun : sans verrou, la course (deux
  // lectures « 0 membre » avant la première écriture) se produit à coup sûr.
  for (let round = 0; round < 5; round += 1) {
    await resetDatabase(db);
    await createUser(db, { id: "owner", plan: "FREE", planExpiresAt: null });
    await billing.activatePlanByRef(await pendingPayment("owner", "CENTER", 1));
    const center = await db.center.findUniqueOrThrow({ where: { ownerId: "owner" } });
    const candidates = Array.from({ length: 20 }, (_, index) => `j${index}`);
    for (const id of candidates) await createUser(db, { id, plan: "FREE", planExpiresAt: null });

    // POST lit l'identité de façon SYNCHRONE à l'appel (premier `await
    // auth()`) : chaque requête porte donc bien son propre candidat.
    const responses = await Promise.all(
      candidates.map((id) => {
        auth.userId = id;
        return joinRoute(jsonRequest("/api/center/join", "POST", { code: center.inviteCode }));
      }),
    );
    const ok = responses.filter((response) => response.status === 200).length;
    assert.equal(ok, 1, `tour ${round}`);
    assert.equal(await db.user.count({ where: { centerId: center.id } }), 1);
  }
});

test("SUPER_ADMIN qui achète des sièges : reste SUPER_ADMIN", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  await billing.activatePlanByRef(await pendingPayment("admin", "CENTER", 5));
  assert.equal((await user("admin")).role, "SUPER_ADMIN");
});

test("achat CENTER sans plan actif : plan CENTER limité à la période des sièges (pas de cumul)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "FREE", planExpiresAt: null, credits: 0 });
  await billing.activatePlanByRef(await pendingPayment("owner", "CENTER", 2));
  await billing.activatePlanByRef(await pendingPayment("owner", "CENTER", 2));
  const owner = await user("owner");
  assert.equal(owner.plan, "CENTER");
  assert.equal(owner.role, "CENTER_ADMIN");
  assert.equal(daysFromNow(owner.planExpiresAt), 30);
  assert.equal(owner.credits, 4 * 15);
});

/* ───────────────────────── Pas de rétrogradation ─────────────────────── */

test("achat Student pendant un Premium actif : Premium conservé, durée au prorata", { skip: integrationSkip }, async () => {
  await createUser(db, {
    id: "u1",
    plan: "PREMIUM",
    planExpiresAt: new Date(Date.now() + 10 * DAY),
    credits: 0,
  });
  await billing.activatePlanByRef(await pendingPayment("u1", "STUDENT"));
  const after = await user("u1");
  assert.equal(after.plan, "PREMIUM");
  assert.equal(daysFromNow(after.planExpiresAt), 25, "10 j + 30 j Student ≈ 15 j Premium");
  assert.equal(after.credits, 15, "les crédits payés sont bien crédités");
});

test("achat Premium pendant un Student actif : montée en gamme, durée cumulée", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", plan: "STUDENT", planExpiresAt: new Date(Date.now() + 5 * DAY) });
  await billing.activatePlanByRef(await pendingPayment("u1", "PREMIUM"));
  const after = await user("u1");
  assert.equal(after.plan, "PREMIUM");
  assert.equal(daysFromNow(after.planExpiresAt), 35);
});

test("achat Student après expiration d'un Premium : Student, 30 jours", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", plan: "PREMIUM", planExpiresAt: new Date(Date.now() - DAY) });
  await billing.activatePlanByRef(await pendingPayment("u1", "STUDENT"));
  const after = await user("u1");
  assert.equal(after.plan, "STUDENT");
  assert.equal(daysFromNow(after.planExpiresAt), 30);
});

test("propriétaire Premium qui achète des sièges : son Premium est conservé", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", plan: "PREMIUM", planExpiresAt: new Date(Date.now() + 20 * DAY) });
  await billing.activatePlanByRef(await pendingPayment("u1", "CENTER", 3));
  const after = await user("u1");
  assert.equal(after.plan, "PREMIUM");
  assert.equal(daysFromNow(after.planExpiresAt), 20);
});

/* ─────────────────── 11. Idempotence sous rejeu concurrent ───────────── */

test("11. webhook rejoué 6 fois EN PARALLÈLE : un seul octroi (plan, crédits, sièges)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "FREE", planExpiresAt: null, credits: 0 });
  const ref = await pendingPayment("owner", "CENTER", 4);
  const results = await Promise.all(Array.from({ length: 6 }, () => billing.activatePlanByRef(ref)));
  assert.ok(results.every(Boolean));
  assert.equal((await user("owner")).credits, 4 * 15);
  assert.equal(await db.centerSeatGrant.count(), 1);
  assert.equal(await db.center.count(), 1);

  const studentRef = await pendingPayment("owner", "STUDENT");
  await Promise.all(Array.from({ length: 6 }, () => billing.activatePlanByRef(studentRef)));
  assert.equal((await user("owner")).credits, 4 * 15 + 15);
});

test("référence inconnue : false, aucun effet", { skip: integrationSkip }, async () => {
  assert.equal(await billing.activatePlanByRef("inconnue"), false);
});
