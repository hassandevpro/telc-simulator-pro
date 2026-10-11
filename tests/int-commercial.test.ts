/**
 * Règles commerciales validées (PostgreSQL réel) :
 *  1. débit au démarrage + confirmation (aperçu) + remboursement manuel admin ;
 *  2. achat Student bloqué pendant un Premium actif (3 prestataires) ;
 *  3. sièges Centre : nouveau / renouvellement à l'échéance / ajout au prorata.
 * Les prestataires de paiement sont SIMULÉS : ce fichier prouve ce que NOTRE
 * serveur décide (montant, mode, dates), pas le comportement des prestataires.
 * Voir tests/helpers/pg.ts pour l'activation (TEST_DATABASE_URL).
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

const auth = { user: null as { id: string; email: string; name?: string; role?: string } | null };
mock.module("@/lib/auth", {
  namedExports: { auth: async () => (auth.user ? { user: auth.user } : null) },
});

/** Appels sortants vers les prestataires (simulés). */
const outbound = {
  stripe: [] as Record<string, unknown>[],
  flutterwave: [] as Record<string, unknown>[],
  camerpay: [] as Record<string, unknown>[],
};
mock.module("@/lib/payments/stripe", {
  namedExports: {
    stripe: () => ({
      checkout: {
        sessions: {
          create: async (args: Record<string, unknown>) => {
            outbound.stripe.push(args);
            return { id: `cs_${outbound.stripe.length}_${Math.random().toString(36).slice(2, 8)}`, url: "https://stripe.test/pay" };
          },
        },
      },
    }),
  },
});
mock.module("@/lib/payments/flutterwave", {
  namedExports: {
    createFlutterwavePayment: async (args: Record<string, unknown>) => {
      outbound.flutterwave.push(args);
      return "https://flutterwave.test/pay";
    },
    verifyFlutterwaveTransaction: async () => null,
    FlutterwaveUnavailableError: class extends Error {},
  },
});
mock.module("@/lib/payments/camerpay", {
  namedExports: {
    CAMERPAY_PAYMENT_METHOD: "orange_money",
    normalizeCameroonMsisdn: (value: string | null) => (value ? value.replace(/\D/g, "").slice(-9) : null),
    initiateCamerPayPayment: async (args: Record<string, unknown>) => {
      outbound.camerpay.push(args);
      return { payUrl: "https://camerpay.test/pay", uuid: `uuid-${outbound.camerpay.length}` };
    },
  },
});

type Handler = (request: Request, ctx?: unknown) => Promise<Response>;
let db: typeof import("@/lib/db").db;
let billing: typeof import("@/lib/billing");
let seatsLib: typeof import("@/lib/center-seats");
let stripeRoute: Handler;
let flutterwaveRoute: Handler;
let camerpayRoute: Handler;
let centerCheckout: Handler;
let centerQuote: Handler;
let saveRoute: Handler;
let sessionGet: Handler;
let refundRoute: Handler;
let adminSessions: Handler;

before(async () => {
  if (integrationSkip) return;
  db = (await import("@/lib/db")).db;
  billing = await import("@/lib/billing");
  seatsLib = await import("@/lib/center-seats");
  stripeRoute = (await import("@/app/api/payments/stripe/route")).POST;
  flutterwaveRoute = (await import("@/app/api/payments/flutterwave/route")).POST;
  camerpayRoute = (await import("@/app/api/payments/camerpay/route")).POST;
  centerCheckout = (await import("@/app/api/center/checkout/route")).POST;
  centerQuote = (await import("@/app/api/center/quote/route")).GET as Handler;
  saveRoute = (await import("@/app/api/sessions/route")).POST;
  sessionGet = (await import("@/app/api/sessions/[sessionId]/route")).GET as Handler;
  refundRoute = (await import("@/app/api/admin/sessions/[sessionId]/refund/route")).POST as Handler;
  adminSessions = (await import("@/app/api/admin/sessions/route")).GET as Handler;
});

after(async () => {
  if (!integrationSkip) await db.$disconnect();
});

beforeEach(async () => {
  if (integrationSkip) return;
  await resetDatabase(db);
  await db.$executeRawUnsafe('TRUNCATE "CreditAdjustment"');
  auth.user = null;
  outbound.stripe.length = 0;
  outbound.flutterwave.length = 0;
  outbound.camerpay.length = 0;
});

const as = (id: string, role = "STUDENT") => {
  auth.user = { id, email: `${id}@test.local`, name: id, role };
};
const user = (id: string) => db.user.findUniqueOrThrow({ where: { id } });
const days = (date: Date | null | undefined) => (date ? (date.getTime() - Date.now()) / DAY : NaN);
const near = (actual: number, expected: number, message: string) =>
  assert.ok(Math.abs(actual - expected) < 0.01, `${message} : ${actual} ≠ ${expected}`);

/* ════════════════ 2. Student pendant un Premium actif ════════════════ */

const premiumUser = (id = "u1", expiresInDays = 10) =>
  createUser(db, { id, plan: "PREMIUM", planExpiresAt: new Date(Date.now() + expiresInDays * DAY) });

for (const [name, call] of [
  ["Stripe", () => stripeRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }))],
  ["Flutterwave", () => flutterwaveRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }))],
  ["CamerPay", () => camerpayRoute(jsonRequest("/p", "POST", { plan: "STUDENT", phone: "699123456" }))],
] as const) {
  test(`Student refusé pendant un Premium actif — ${name} : 409, aucun paiement créé, prestataire non appelé`, { skip: integrationSkip }, async () => {
    await premiumUser();
    as("u1");
    const response = await call();
    assert.equal(response.status, 409);
    const body = await response.json();
    assert.equal(body.code, "PREMIUM_ACTIVE");
    assert.match(body.error, /Premium/);
    assert.ok(body.premiumUntil > Date.now());
    assert.equal(await db.payment.count(), 0);
    assert.deepEqual([outbound.stripe.length, outbound.flutterwave.length, outbound.camerpay.length], [0, 0, 0]);
  });
}

test("achats toujours permis : Premium pendant Premium (renouvellement), Student sans Premium, Student après expiration", { skip: integrationSkip }, async () => {
  await premiumUser("u1");
  as("u1");
  assert.equal((await flutterwaveRoute(jsonRequest("/p", "POST", { plan: "PREMIUM" }))).status, 200, "renouveler Premium");

  await createUser(db, { id: "u2", plan: "STUDENT", planExpiresAt: new Date(Date.now() + 5 * DAY) });
  as("u2");
  assert.equal((await flutterwaveRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }))).status, 200, "Student → Student");

  await createUser(db, { id: "u3", plan: "PREMIUM", planExpiresAt: new Date(Date.now() - DAY) });
  as("u3");
  assert.equal((await flutterwaveRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }))).status, 200, "Premium expiré");

  await createUser(db, { id: "u4", plan: "FREE", planExpiresAt: null });
  as("u4");
  assert.equal((await stripeRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }))).status, 200, "FREE");
});

test("filet de sécurité : un paiement Student ouvert AVANT l'achat Premium et réglé après ne rétrograde pas", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "u1", plan: "FREE", planExpiresAt: null, credits: 0 });
  as("u1");
  assert.equal((await flutterwaveRoute(jsonRequest("/p", "POST", { plan: "STUDENT" }))).status, 200);
  const studentRef = (await db.payment.findFirstOrThrow({ where: { plan: "STUDENT" } })).providerRef;
  await db.user.update({ where: { id: "u1" }, data: { plan: "PREMIUM", planExpiresAt: new Date(Date.now() + 20 * DAY) } });
  await billing.activatePlanByRef(studentRef);
  const after = await user("u1");
  assert.equal(after.plan, "PREMIUM");
  near(days(after.planExpiresAt), 20 + 15, "20 j + 30 j Student = +15 j Premium");
  assert.equal(after.credits, 15, "les crédits payés sont ajoutés");
});

/* ═══════════════════════ 3. Sièges Centre ═══════════════════════ */

/** Initie un achat de sièges par le VRAI route handler et renvoie le paiement créé. */
async function buySeats(
  provider: "stripe" | "flutterwave" | "camerpay",
  seats: number,
  mode?: "renew" | "add",
) {
  const before = await db.payment.count();
  const response =
    provider === "camerpay"
      ? await camerpayRoute(jsonRequest("/p", "POST", { plan: "CENTER", seats, phone: "699123456", ...(mode ? { mode } : {}) }))
      : await centerCheckout(jsonRequest("/c", "POST", { provider, seats, ...(mode ? { mode } : {}) }));
  return { response, created: (await db.payment.count()) - before };
}
const lastPayment = () => db.payment.findFirstOrThrow({ orderBy: { createdAt: "desc" } });
const grants = (centerId: string) => db.centerSeatGrant.findMany({ where: { centerId }, orderBy: { startsAt: "asc" } });

test("premier achat : NEW, prix plein calculé par le serveur, 30 jours dès l'activation", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "FREE", planExpiresAt: null, credits: 0 });
  as("owner");
  const { response } = await buySeats("flutterwave", 10);
  assert.equal(response.status, 200);
  const payment = await lastPayment();
  assert.deepEqual([payment.centerMode, payment.amount, payment.currency, payment.periodDays], ["NEW", 25_000, "XAF", null]);
  assert.equal(outbound.flutterwave[0].amount, 25_000);

  await billing.activatePlanByRef(payment.providerRef);
  const center = await db.center.findUniqueOrThrow({ where: { ownerId: "owner" } });
  const [grant] = await grants(center.id);
  near(days(grant.expiresAt), 30, "30 jours");
  assert.equal(grant.seats, 10);
  const owner = await user("owner");
  assert.equal(owner.credits, 150);
  assert.equal(owner.role, "CENTER_ADMIN");
});

test("le montant ne vient JAMAIS du navigateur", { skip: integrationSkip }, async () => {
  await createUser(db, { id: "owner", plan: "FREE", planExpiresAt: null });
  as("owner");
  const response = await centerCheckout(
    jsonRequest("/c", "POST", { provider: "flutterwave", seats: 4, amount: 1, mode: "add", centerMode: "NEW", periodDays: 1 }),
  );
  assert.equal(response.status, 200);
  assert.equal((await lastPayment()).amount, 10_000);
  // Nombre de sièges hors bornes.
  assert.equal((await centerCheckout(jsonRequest("/c", "POST", { provider: "flutterwave", seats: 0 }))).status, 400);
  assert.equal((await centerCheckout(jsonRequest("/c", "POST", { provider: "flutterwave", seats: 501 }))).status, 400);
});

/** Centre de `seats` sièges actifs pendant encore `daysLeft` jours. */
async function centerWithActiveSeats(seats = 10, daysLeft = 10) {
  await createUser(db, { id: "owner", plan: "CENTER", role: "CENTER_ADMIN", planExpiresAt: new Date(Date.now() + daysLeft * DAY), credits: 0 });
  const center = await db.center.create({ data: { name: "C", ownerId: "owner", inviteCode: "inv-" + Math.random() } });
  await db.centerSeatGrant.create({
    data: { centerId: center.id, seats, startsAt: new Date(Date.now() - (30 - daysLeft) * DAY), expiresAt: new Date(Date.now() + daysLeft * DAY) },
  });
  return center;
}

test("sièges actifs et aucun choix : 409 CENTER_MODE_REQUIRED, aucun paiement, prestataire non appelé", { skip: integrationSkip }, async () => {
  await centerWithActiveSeats();
  as("owner");
  for (const provider of ["stripe", "flutterwave", "camerpay"] as const) {
    const { response, created } = await buySeats(provider, 5);
    assert.equal(response.status, 409, provider);
    const body = await response.json();
    assert.equal(body.code, "CENTER_MODE_REQUIRED");
    assert.ok(body.activeEnd > Date.now());
    assert.equal(created, 0);
  }
  assert.deepEqual([outbound.stripe.length, outbound.flutterwave.length, outbound.camerpay.length], [0, 0, 0]);
});

test("RENEW : prix plein, la nouvelle période commence à l'échéance, rien n'est payé deux fois", { skip: integrationSkip }, async () => {
  const center = await centerWithActiveSeats(10, 10);
  as("owner");
  const { response } = await buySeats("flutterwave", 20, "renew");
  assert.equal(response.status, 200);
  const payment = await lastPayment();
  assert.deepEqual([payment.centerMode, payment.amount], ["RENEW", 50_000]);

  await billing.activatePlanByRef(payment.providerRef);
  const [current, next] = await grants(center.id);
  near(days(current.expiresAt), 10, "période en cours inchangée");
  near((next.startsAt.getTime() - current.expiresAt.getTime()) / DAY, 0, "aucun chevauchement ni trou");
  near(days(next.expiresAt), 40, "se termine 30 j après l'échéance");
  assert.equal(next.seats, 20);

  // Pendant la période en cours, les 20 nouveaux sièges ne sont PAS encore actifs.
  assert.equal(await seatsLib.activeSeats(db, center.id), 10);
  // Le plan du propriétaire court jusqu'à la fin de la période payée.
  near(days((await user("owner")).planExpiresAt), 40, "plan propriétaire");
  assert.equal((await user("owner")).credits, 300);
});

test("deux RENEW payés EN MÊME TEMPS s'enchaînent (verrou du centre) au lieu de se chevaucher", { skip: integrationSkip }, async () => {
  const center = await centerWithActiveSeats(10, 10);
  as("owner");
  await buySeats("flutterwave", 5, "renew");
  const first = await lastPayment();
  await buySeats("flutterwave", 7, "renew");
  const second = await lastPayment();
  assert.notEqual(first.providerRef, second.providerRef);

  await Promise.all([billing.activatePlanByRef(first.providerRef), billing.activatePlanByRef(second.providerRef)]);
  const all = await grants(center.id);
  assert.equal(all.length, 3);
  const [, a, b] = all;
  near((b.startsAt.getTime() - a.expiresAt.getTime()) / DAY, 0, "la seconde commence quand la première finit");
  near(days(b.expiresAt), 70, "10 j + 30 j + 30 j");
});

test("ADD : prorata sur les jours restants, sièges actifs MAINTENANT mais pas au-delà de l'échéance", { skip: integrationSkip }, async () => {
  const center = await centerWithActiveSeats(10, 10);
  as("owner");
  const { response } = await buySeats("flutterwave", 10, "add");
  assert.equal(response.status, 200);
  const payment = await lastPayment();
  // ⌈10 j⌉ → 2 500 × 10 × 10 / 30 = 8 333,33 → 8 333 FCFA.
  assert.deepEqual([payment.centerMode, payment.amount, payment.periodDays], ["ADD", 8_333, 10]);

  await billing.activatePlanByRef(payment.providerRef);
  assert.equal(await seatsLib.activeSeats(db, center.id), 20, "10 + 10 actifs aujourd'hui");
  const [, added] = await grants(center.id);
  near(days(added.expiresAt), 10, "même échéance que la période en cours");
  assert.equal(await seatsLib.activeSeats(db, center.id, new Date(Date.now() + 11 * DAY)), 0, "rien ne survit à l'échéance");
  // Crédits proportionnels aux jours payés : 15 × 10 × 10 / 30 = 50.
  assert.equal((await user("owner")).credits, 50);
  near(days((await user("owner")).planExpiresAt), 10, "l'ADD ne prolonge pas le plan");
});

test("ADD puis RENEW : les sièges ajoutés ne sont pas reconduits tout seuls", { skip: integrationSkip }, async () => {
  const center = await centerWithActiveSeats(10, 10);
  as("owner");
  await buySeats("flutterwave", 5, "add");
  await billing.activatePlanByRef((await lastPayment()).providerRef);
  await buySeats("flutterwave", 10, "renew");
  await billing.activatePlanByRef((await lastPayment()).providerRef);
  assert.equal(await seatsLib.activeSeats(db, center.id), 15);
  assert.equal(await seatsLib.activeSeats(db, center.id, new Date(Date.now() + 15 * DAY)), 10, "période suivante : seulement les 10 renouvelés");
});

test("ADD payé après l'expiration de la période : sièges pour la durée payée seulement", { skip: integrationSkip }, async () => {
  const center = await centerWithActiveSeats(10, 10);
  as("owner");
  await buySeats("flutterwave", 3, "add");
  const payment = await lastPayment();
  await db.centerSeatGrant.updateMany({ where: { centerId: center.id }, data: { expiresAt: new Date(Date.now() - 1000) } });
  await billing.activatePlanByRef(payment.providerRef);
  const [added] = await db.centerSeatGrant.findMany({ where: { centerId: center.id, seats: 3 } });
  near(days(added.expiresAt), 10, "10 jours payés, pas 30");
});

test("webhook rejoué en parallèle : une seule dotation, un seul crédit", { skip: integrationSkip }, async () => {
  const center = await centerWithActiveSeats(10, 10);
  as("owner");
  await buySeats("flutterwave", 4, "renew");
  const ref = (await lastPayment()).providerRef;
  await Promise.all(Array.from({ length: 6 }, () => billing.activatePlanByRef(ref)));
  assert.equal((await grants(center.id)).length, 2);
  assert.equal((await user("owner")).credits, 60);
});

test("paiement en attente ANTÉRIEUR à la règle (centerMode NULL) : ancien traitement préservé", { skip: integrationSkip }, async () => {
  const center = await centerWithActiveSeats(10, 10);
  await db.payment.create({
    data: { userId: "owner", provider: "STRIPE", providerRef: "legacy-1", plan: "CENTER", seats: 5, amount: 20, currency: "EUR", status: "PENDING" },
  });
  await billing.activatePlanByRef("legacy-1");
  const added = await db.centerSeatGrant.findFirstOrThrow({ where: { centerId: center.id, paymentRef: "legacy-1" } });
  near(days(added.startsAt), 0, "démarre maintenant");
  near(days(added.expiresAt), 30, "30 jours dès l'activation");
  assert.equal((await user("owner")).credits, 75);
});

test("Stripe : une seule ligne au montant calculé, mode en métadonnées ; CamerPay : même montant", { skip: integrationSkip }, async () => {
  await centerWithActiveSeats(10, 10);
  as("owner");
  await buySeats("stripe", 10, "add");
  const stripeArgs = outbound.stripe[0] as { line_items: { quantity: number; price_data: { unit_amount: number } }[]; metadata: Record<string, string> };
  assert.equal(stripeArgs.line_items.length, 1);
  assert.equal(stripeArgs.line_items[0].quantity, 1);
  assert.equal(stripeArgs.line_items[0].price_data.unit_amount, 1333, "4 € × 10 × 10 / 30 = 13,33 €");
  assert.equal(stripeArgs.metadata.centerMode, "ADD");
  const stripePayment = await lastPayment();
  assert.deepEqual([stripePayment.amount, stripePayment.currency], [13.33, "EUR"]);

  await buySeats("camerpay", 10, "add");
  const camer = await lastPayment();
  assert.deepEqual([camer.centerMode, camer.amount, camer.currency, camer.periodDays], ["ADD", 8_333, "XAF", 10]);
  assert.equal((outbound.camerpay[0] as { amount: number }).amount, 8_333);
});

test("devis affiché = montant facturé (même calcul), et choix demandé quand des sièges sont actifs", { skip: integrationSkip }, async () => {
  await centerWithActiveSeats(10, 10);
  as("owner");
  const ask = async (query: string) => (await centerQuote(jsonRequest(`/api/center/quote?${query}`, "GET"))).json();

  const needs = await ask("seats=10");
  assert.equal(needs.needsMode, true);
  const quote = await ask("seats=10&mode=add");
  assert.equal(quote.needsMode, false);
  await buySeats("flutterwave", 10, "add");
  assert.equal((await lastPayment()).amount, quote.amountXaf);
  assert.equal(quote.amountXaf, 8_333);
  assert.equal(quote.amountEur, 13.33);

  assert.equal((await centerQuote(jsonRequest("/api/center/quote?seats=0", "GET"))).status, 400);
  // Anonyme : devis d'un premier achat.
  auth.user = null;
  const anonymous = await ask("seats=10");
  assert.deepEqual([anonymous.needsMode, anonymous.mode, anonymous.amountXaf], [false, "NEW", 25_000]);
});

/* ═══════ 1. Débit au démarrage, confirmation, remboursement manuel ═══════ */

async function startedChargedSession(sessionId = "s1", userId = "cand", credits = 2) {
  const exam = await createPaidExam(db);
  await createUser(db, { id: userId, credits });
  as(userId);
  const body = (status: string, startedAt: number | null) =>
    jsonRequest("/api/sessions", "POST", { sessionId, examId: exam.examId, status, startedAt, answers: {}, playedAudioIds: [] });
  assert.equal((await saveRoute(body("AUDIO_CHECK", null))).status, 200);
  return { exam, start: () => saveRoute(body("IN_PROGRESS", Date.now())) };
}

test("confirmation : l'aperçu annonce le débit, le solde — et un rejeu gratuit", { skip: integrationSkip }, async () => {
  const { start } = await startedChargedSession("s1", "cand", 2);
  const ctx = (id: string) => ({ params: Promise.resolve({ sessionId: id }) });
  const preview = (await (await sessionGet(jsonRequest("/s", "GET"), ctx("s1"))).json()).creditPreview;
  assert.deepEqual(preview, { charge: true, balance: 2 });
  assert.equal((await start()).status, 200);
  assert.equal((await user("cand")).credits, 1);
  // Session démarrée : plus d'aperçu.
  assert.equal((await (await sessionGet(jsonRequest("/s", "GET"), ctx("s1"))).json()).creditPreview, undefined);

  // Terminer l'examen puis en rejouer un : gratuit, et annoncé comme tel.
  await db.examSession.update({ where: { id: "s1" }, data: { status: "SCORED" } });
  const body = (status: string, startedAt: number | null) =>
    jsonRequest("/api/sessions", "POST", { sessionId: "s2", examId: "exam-paid", status, startedAt, answers: {}, playedAudioIds: [] });
  await saveRoute(body("AUDIO_CHECK", null));
  assert.equal((await (await sessionGet(jsonRequest("/s", "GET"), ctx("s2"))).json()).creditPreview.charge, false);
});

test("remboursement manuel : +1 crédit, tracé, session ouverte fermée", { skip: integrationSkip }, async () => {
  const { start } = await startedChargedSession("s1", "cand", 1);
  await start();
  assert.equal((await user("cand")).credits, 0);
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  as("admin", "SUPER_ADMIN");

  const response = await refundRoute(jsonRequest("/r", "POST", { reason: "Panne réseau du centre" }), { params: Promise.resolve({ sessionId: "s1" }) });
  assert.equal(response.status, 200);
  assert.equal((await user("cand")).credits, 1);
  const session = await db.examSession.findUniqueOrThrow({ where: { id: "s1" } });
  assert.deepEqual([session.creditStatus, session.status], ["REFUNDED", "EXPIRED"]);
  const log = await db.creditAdjustment.findUniqueOrThrow({ where: { sessionId: "s1" } });
  assert.deepEqual([log.accountId, log.amount, log.adminId, log.reason], ["cand", 1, "admin", "Panne réseau du centre"]);
});

test("remboursement : une seule fois, même sous 10 clics simultanés", { skip: integrationSkip }, async () => {
  const { start } = await startedChargedSession("s1", "cand", 1);
  await start();
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  as("admin", "SUPER_ADMIN");
  const ctx = { params: Promise.resolve({ sessionId: "s1" }) };
  const responses = await Promise.all(
    Array.from({ length: 10 }, () => refundRoute(jsonRequest("/r", "POST", { reason: "Test concurrence" }), ctx)),
  );
  assert.equal(responses.filter((r) => r.status === 200).length, 1);
  assert.equal(responses.filter((r) => r.status === 409).length, 9);
  assert.equal((await user("cand")).credits, 1, "crédité UNE fois (0 + 1)");
  assert.equal(await db.creditAdjustment.count(), 1);
});

test("remboursement refusé : non-admin, JWT admin périmé, sans motif, session inconnue, rejeu gratuit", { skip: integrationSkip }, async () => {
  const { start, exam } = await startedChargedSession("s1", "cand", 2);
  await start();
  const ctx = (id: string) => ({ params: Promise.resolve({ sessionId: id }) });
  const refund = (id: string, reason = "Motif valable") => refundRoute(jsonRequest("/r", "POST", { reason }), ctx(id));

  as("cand");
  assert.equal((await refund("s1")).status, 403, "le candidat ne s'auto-rembourse pas");
  auth.user = { id: "cand", email: "cand@test.local", role: "SUPER_ADMIN" };
  assert.equal((await refund("s1")).status, 403, "rôle relu en base, pas dans le JWT");
  assert.equal((await user("cand")).credits, 1);

  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  as("admin", "SUPER_ADMIN");
  assert.equal((await refund("s1", "ab")).status, 400, "motif trop court");
  assert.equal((await refund("inconnue")).status, 404);

  // Rejeu gratuit : pas de débit donc rien à rembourser.
  await db.examSession.update({ where: { id: "s1" }, data: { status: "SCORED" } });
  await db.examSession.create({ data: { id: "s2", userId: "cand", examId: exam.examId, status: "IN_PROGRESS", startedAt: new Date(), creditStatus: "EXEMPT" } });
  const exempt = await refund("s2");
  assert.equal(exempt.status, 409);
  assert.equal((await exempt.json()).code, "NOT_REFUNDABLE");
  assert.equal((await user("cand")).credits, 1);
});

test("remboursement d'un étudiant de centre : le pool du CENTRE est recrédité", { skip: integrationSkip }, async () => {
  const exam = await createPaidExam(db);
  const center = await centerWithActiveSeats(5, 20);
  await db.user.update({ where: { id: "owner" }, data: { credits: 3 } });
  await createUser(db, { id: "eleve", plan: "FREE", planExpiresAt: null, credits: 0, centerId: center.id, centerJoinedAt: new Date(Date.now() - DAY) });
  as("eleve");
  const body = (status: string, startedAt: number | null) =>
    jsonRequest("/api/sessions", "POST", { sessionId: "s1", examId: exam.examId, status, startedAt, answers: {}, playedAudioIds: [] });
  await saveRoute(body("AUDIO_CHECK", null));
  assert.equal((await saveRoute(body("IN_PROGRESS", Date.now()))).status, 200);
  assert.equal((await user("owner")).credits, 2, "le pool du centre est débité");
  assert.equal((await db.examSession.findUniqueOrThrow({ where: { id: "s1" } })).creditAccountId, "owner");

  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  as("admin", "SUPER_ADMIN");
  await refundRoute(jsonRequest("/r", "POST", { reason: "Erreur de manipulation" }), { params: Promise.resolve({ sessionId: "s1" }) });
  assert.equal((await user("owner")).credits, 3, "le pool du centre retrouve son crédit");
  assert.equal((await user("eleve")).credits, 0);
});

test("support : recherche des sessions par e-mail réservée à l'admin, remboursement visible", { skip: integrationSkip }, async () => {
  const { start } = await startedChargedSession("s1", "cand", 1);
  await start();
  const search = () => adminSessions(jsonRequest("/api/admin/sessions?email=cand@test.local", "GET"));
  as("cand");
  assert.equal((await search()).status, 403);
  await createUser(db, { id: "admin", role: "SUPER_ADMIN" });
  as("admin", "SUPER_ADMIN");
  await refundRoute(jsonRequest("/r", "POST", { reason: "Geste commercial" }), { params: Promise.resolve({ sessionId: "s1" }) });
  const body = await (await search()).json();
  assert.equal(body.user.email, "cand@test.local");
  assert.equal(body.sessions[0].creditStatus, "REFUNDED");
  assert.equal(body.sessions[0].refund.reason, "Geste commercial");
});
