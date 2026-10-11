/**
 * Droits payés existants — comptes SANS date d'expiration (PostgreSQL réel).
 *
 * Avant les paiements en ligne, des plans étaient attribués à la main
 * (planExpiresAt NULL) ; le code historique traite NULL comme « sans
 * échéance » (aucune rétrogradation). Ces comptes ne doivent JAMAIS perdre de
 * droits à cause d'un achat, d'une migration ou d'un webhook.
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

const auth = { user: null as { id: string; email: string; role?: string } | null };
mock.module("@/lib/auth", {
  namedExports: { auth: async () => (auth.user ? { user: auth.user } : null) },
});

const outbound = { calls: 0 };
mock.module("@/lib/payments/stripe", {
  namedExports: {
    stripe: () => ({ checkout: { sessions: { create: async () => (outbound.calls++, { id: `cs_${Math.random()}`, url: "https://stripe.test" }) } } }),
  },
});
mock.module("@/lib/payments/flutterwave", {
  namedExports: {
    createFlutterwavePayment: async () => (outbound.calls++, "https://flutterwave.test"),
    verifyFlutterwaveTransaction: async () => null,
    FlutterwaveUnavailableError: class extends Error {},
  },
});
mock.module("@/lib/payments/camerpay", {
  namedExports: {
    CAMERPAY_PAYMENT_METHOD: "orange_money",
    normalizeCameroonMsisdn: () => "699123456",
    initiateCamerPayPayment: async () => (outbound.calls++, { payUrl: "https://camerpay.test", uuid: "u" }),
  },
});

type Handler = (request: Request, ctx?: unknown) => Promise<Response>;
let db: typeof import("@/lib/db").db;
let billing: typeof import("@/lib/billing");
let stripeRoute: Handler;
let flutterwaveRoute: Handler;
let camerpayRoute: Handler;
let centerCheckout: Handler;
let centerQuote: Handler;

before(async () => {
  if (integrationSkip) return;
  db = (await import("@/lib/db")).db;
  billing = await import("@/lib/billing");
  stripeRoute = (await import("@/app/api/payments/stripe/route")).POST;
  flutterwaveRoute = (await import("@/app/api/payments/flutterwave/route")).POST;
  camerpayRoute = (await import("@/app/api/payments/camerpay/route")).POST;
  centerCheckout = (await import("@/app/api/center/checkout/route")).POST;
  centerQuote = (await import("@/app/api/center/quote/route")).GET as Handler;
});

after(async () => {
  if (!integrationSkip) await db.$disconnect();
});

beforeEach(async () => {
  if (integrationSkip) return;
  await resetDatabase(db);
  await db.$executeRawUnsafe('TRUNCATE "CreditAdjustment"');
  auth.user = null;
  outbound.calls = 0;
});

const as = (id: string) => {
  auth.user = { id, email: `${id}@test.local` };
};
const user = (id: string) => db.user.findUniqueOrThrow({ where: { id } });
let ref = 0;
async function pending(userId: string, plan: "STUDENT" | "PREMIUM" | "CENTER", seats: number | null = null) {
  const providerRef = `ref-${(ref += 1)}`;
  await db.payment.create({
    data: { userId, provider: "STRIPE", providerRef, plan, seats, amount: 1, currency: "EUR", status: "PENDING" },
  });
  return providerRef;
}

/* ───────────── Plans personnels sans date (attribués à la main) ───────────── */

test("Premium SANS date qui achète Student (paiement déjà en attente) : plan et absence d'échéance conservés, crédits ajoutés", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", plan: "PREMIUM", planExpiresAt: null, credits: 4 });
  await billing.activatePlanByRef(await pending("u1", "STUDENT"));
  const after = await user("u1");
  assert.equal(after.plan, "PREMIUM");
  assert.equal(after.planExpiresAt, null, "aucune échéance ne doit apparaître");
  assert.equal(after.credits, 4 + 15, "la valeur payée (crédits) n'est pas perdue");
});

test("Student SANS date qui achète Premium (paiement en attente) : aucune échéance imposée", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", plan: "STUDENT", planExpiresAt: null, credits: 0 });
  await billing.activatePlanByRef(await pending("u1", "PREMIUM"));
  const after = await user("u1");
  assert.equal(after.planExpiresAt, null);
  assert.equal(after.plan, "STUDENT", "l'accès ne devient jamais temporaire");
  assert.equal(after.credits, 50);
});

for (const [name, call] of [
  ["Stripe", () => stripeRoute(jsonRequest("/p", "POST", { plan: "PREMIUM" }))],
  ["Flutterwave", () => flutterwaveRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }))],
  ["CamerPay", () => camerpayRoute(jsonRequest("/p", "POST", { plan: "PREMIUM", phone: "699123456" }))],
] as const) {
  test(`achat refusé AVANT paiement pour un plan sans date — ${name} : 409 OPEN_ENDED_PLAN`, { skip: integrationSkip }, async () => {
    await createUser(db, { id: "u1", plan: "STUDENT", planExpiresAt: null });
    as("u1");
    const response = await call();
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.code, "OPEN_ENDED_PLAN");
    assert.match(body.error, /unbefristet|WhatsApp|Support/i);
    assert.equal(await db.payment.count(), 0);
    assert.equal(outbound.calls, 0, "le prestataire n'est pas appelé");
  });
}

test("Premium SANS date : Student est refusé (comme un Premium daté)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", plan: "PREMIUM", planExpiresAt: null });
  as("u1");
  const response = await flutterwaveRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }));
  assert.equal(response.status, 409);
});

test("comptes FREE et plans datés : achats inchangés", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "free", plan: "FREE", planExpiresAt: null });
  as("free");
  assert.equal((await flutterwaveRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }))).status, 200);
  await createUser(db, { id: "dated", plan: "STUDENT", planExpiresAt: new Date(Date.now() + 5 * DAY) });
  as("dated");
  assert.equal((await flutterwaveRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }))).status, 200);
});

/* ─────────────── Centres dont le propriétaire n'a pas de date ─────────────── */

test("sièges d'un propriétaire SANS date : ni 30 jours ni coupure — sièges sans échéance, élèves conservés", { skip: integrationSkip }, async () => {
  // Reproduit l'état « d'avant » puis la conversion de la migration 20261011.
  await createUser(db, { id: "owner", plan: "CENTER", role: "CENTER_ADMIN", planExpiresAt: null });
  const center = await db.center.create({ data: { name: "C", ownerId: "owner", inviteCode: "inv-open", seats: 30 } });
  await createUser(db, { id: "eleve", plan: "FREE", planExpiresAt: null, centerId: center.id, centerJoinedAt: new Date(Date.now() - DAY) });
  const migration = (await import("node:fs")).readFileSync(
    "prisma/migrations/20261011120000_security_hardening/migration.sql",
    "utf8",
  );
  // On rejoue UNIQUEMENT l'INSERT de reprise des sièges.
  const insert = migration.slice(migration.indexOf('INSERT INTO "CenterSeatGrant"'));
  await db.$executeRawUnsafe(insert);

  const grant = await db.centerSeatGrant.findFirstOrThrow({ where: { centerId: center.id } });
  assert.equal(grant.seats, 30);
  assert.ok(grant.expiresAt.getUTCFullYear() >= 2099, `échéance ${grant.expiresAt.toISOString()} : droits réduits`);
  // Dans 5 ans, les sièges sont toujours là.
  const { activeSeats } = await import("@/lib/center-seats");
  assert.equal(await activeSeats(db, center.id, new Date(Date.now() + 5 * 365 * DAY)), 30);
  assert.equal(await billing.getEffectivePlanForUser("eleve"), "STUDENT");
});

test("achat de sièges par un propriétaire SANS date : refusé (devis et paiement), plan intact", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "CENTER", role: "CENTER_ADMIN", planExpiresAt: null });
  const center = await db.center.create({ data: { name: "C", ownerId: "owner", inviteCode: "inv-open2" } });
  await db.centerSeatGrant.create({
    data: { centerId: center.id, seats: 30, startsAt: new Date(Date.now() - 400 * DAY), expiresAt: new Date("2099-12-31T00:00:00Z") },
  });
  as("owner");
  const checkout = await centerCheckout(jsonRequest("/c", "POST", { provider: "flutterwave", seats: 5, mode: "add" }));
  assert.equal(checkout.status, 409);
  assert.equal((await checkout.json()).code, "CENTER_OPEN_ENDED");
  assert.equal(await db.payment.count(), 0);
  const quote = await (await centerQuote(jsonRequest("/api/center/quote?seats=5&mode=add", "GET"))).json();
  assert.equal(quote.blocked, true);
  assert.match(quote.message, /unbefristet|Support/i);
});

test("propriétaire sans date : un paiement CENTER déjà en attente ne touche ni son plan ni son échéance", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "CENTER", role: "CENTER_ADMIN", planExpiresAt: null, credits: 0 });
  await db.center.create({ data: { name: "C", ownerId: "owner", inviteCode: "inv-open3" } });
  await billing.activatePlanByRef(await pending("owner", "CENTER", 3));
  const after = await user("owner");
  assert.equal(after.plan, "CENTER");
  assert.equal(after.planExpiresAt, null, "l'absence d'échéance est conservée");
  assert.equal(after.credits, 45);
});

test("Student SANS date qui achète des sièges : son plan personnel reste sans échéance", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", plan: "STUDENT", planExpiresAt: null, credits: 0 });
  as("u1");
  assert.equal((await centerCheckout(jsonRequest("/c", "POST", { provider: "flutterwave", seats: 2 }))).status, 200);
  const payment = await db.payment.findFirstOrThrow();
  await billing.activatePlanByRef(payment.providerRef);
  const after = await user("u1");
  assert.equal(after.plan, "STUDENT");
  assert.equal(after.planExpiresAt, null);
  assert.equal(after.role, "CENTER_ADMIN");
});

test("paiement réel déjà encaissé avant la mise à jour (SUCCESS) : jamais modifié", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", plan: "PREMIUM", planExpiresAt: null, credits: 7 });
  await db.payment.create({ data: { userId: "u1", provider: "STRIPE", providerRef: "done", plan: "STUDENT", amount: 9.9, currency: "EUR", status: "SUCCESS" } });
  assert.equal(await billing.activatePlanByRef("done"), true);
  const after = await user("u1");
  assert.deepEqual([after.plan, after.planExpiresAt, after.credits], ["PREMIUM", null, 7], "rejeu d'un paiement déjà traité : aucun effet");
});

/* ───────── Membres sans quota : l'ancien code leur donnait accès ───────── */

/** Rejoue UNIQUEMENT la reprise des sièges de la migration 20261011. */
async function replaySeatConversion() {
  const migration = (await import("node:fs")).readFileSync(
    "prisma/migrations/20261011120000_security_hardening/migration.sql",
    "utf8",
  );
  await db.$executeRawUnsafe(migration.slice(migration.indexOf('INSERT INTO "CenterSeatGrant"')));
}

test("centre à quota 0 mais avec membres (propriétaire actif) : les membres gardent l'accès", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "CENTER", role: "CENTER_ADMIN", planExpiresAt: new Date(Date.now() + 20 * DAY) });
  const center = await db.center.create({ data: { name: "C", ownerId: "owner", inviteCode: "inv-q0", seats: 0 } });
  for (const id of ["m1", "m2", "m3"]) {
    await createUser(db, { id, plan: "FREE", planExpiresAt: null, centerId: center.id, centerJoinedAt: new Date(Date.now() - DAY) });
  }
  await replaySeatConversion();
  for (const id of ["m1", "m2", "m3"]) {
    assert.equal(await billing.getEffectivePlanForUser(id), "STUDENT", `${id} perd l'accès`);
  }
});

test("centre avec plus de membres que de sièges : tous gardent l'accès (comme avant)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "CENTER", role: "CENTER_ADMIN", planExpiresAt: new Date(Date.now() + 20 * DAY) });
  const center = await db.center.create({ data: { name: "C", ownerId: "owner", inviteCode: "inv-q1", seats: 2 } });
  for (const id of ["m1", "m2", "m3", "m4"]) {
    await createUser(db, { id, plan: "FREE", planExpiresAt: null, centerId: center.id, centerJoinedAt: new Date(Date.now() - DAY) });
  }
  await replaySeatConversion();
  for (const id of ["m1", "m2", "m3", "m4"]) {
    assert.equal(await billing.getEffectivePlanForUser(id), "STUDENT", id);
  }
});

test("propriétaire en plan FREE : aucun droit n'est CRÉÉ par la migration (l'ancien code n'en donnait pas)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "FREE", planExpiresAt: null });
  const center = await db.center.create({ data: { name: "C", ownerId: "owner", inviteCode: "inv-q2", seats: 5 } });
  await createUser(db, { id: "m1", plan: "FREE", planExpiresAt: null, centerId: center.id, centerJoinedAt: new Date(Date.now() - DAY) });
  await replaySeatConversion();
  assert.equal(await db.centerSeatGrant.count(), 0);
  assert.equal(await billing.getEffectivePlanForUser("m1"), "FREE");
});

test("propriétaire dont l'abonnement a expiré : sièges expirés, membres sans accès (inchangé)", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "CENTER", planExpiresAt: new Date(Date.now() - 3 * DAY) });
  const center = await db.center.create({ data: { name: "C", ownerId: "owner", inviteCode: "inv-q3", seats: 5 } });
  await createUser(db, { id: "m1", plan: "FREE", planExpiresAt: null, centerId: center.id, centerJoinedAt: new Date(Date.now() - DAY) });
  await replaySeatConversion();
  assert.equal(await billing.getEffectivePlanForUser("m1"), "FREE");
});
