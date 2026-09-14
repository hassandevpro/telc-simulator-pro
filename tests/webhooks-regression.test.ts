/**
 * Non-regression des paiements EXISTANTS (Stripe + Flutterwave).
 *
 * Execution :
 *   TSX_TSCONFIG_PATH=tsconfig.test.json node --import tsx \
 *     --experimental-test-module-mocks --test tests/*.test.ts
 *
 * Ces tests verifient le CONTRAT des deux webhooks apres le durcissement de
 * lib/billing.ts : signature exigee, et activation declenchee uniquement
 * quand le prestataire confirme reellement le paiement. La signature Stripe
 * est une VRAIE signature, produite par la librairie Stripe installee.
 */
import { test, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import Stripe from "stripe";

process.env.STRIPE_SECRET_KEY = "sk_test_pour_les_tests";
process.env.STRIPE_WEBHOOK_SECRET = "whsec_pour_les_tests";
process.env.FLW_SECRET_HASH = "hash-de-test";

/** References passees a activatePlanByRef — la preuve d'activation. */
const activations: string[] = [];

/** Transaction telle que la renverrait la verification serveur Flutterwave. */
let flwVerification: {
  status: string;
  txRef: string;
  amount: number;
  currency: string;
} | null = null;

/** Paiement en attente correspondant, tel qu'il serait en base. */
let pendingPayment: {
  providerRef: string;
  amount: number;
  currency: string;
} | null = null;

mock.module("@/lib/billing", {
  namedExports: {
    activatePlanByRef: async (providerRef: string) => {
      activations.push(providerRef);
      return true;
    },
  },
});

mock.module("@/lib/payments/flutterwave", {
  namedExports: {
    verifyFlutterwaveTransaction: async () => flwVerification,
  },
});

mock.module("@/lib/db", {
  namedExports: {
    db: {
      payment: {
        findUnique: async ({ where }: { where: { providerRef: string } }) =>
          pendingPayment && pendingPayment.providerRef === where.providerRef
            ? pendingPayment
            : null,
      },
    },
  },
});

let stripeWebhook: (request: Request) => Promise<Response>;
let flutterwaveWebhook: (request: Request) => Promise<Response>;
const stripe = new Stripe("sk_test_pour_les_tests");

before(async () => {
  stripeWebhook = (await import("@/app/api/payments/stripe/webhook/route")).POST;
  flutterwaveWebhook = (
    await import("@/app/api/payments/flutterwave/webhook/route")
  ).POST;
});

beforeEach(() => {
  activations.length = 0;
  flwVerification = null;
  pendingPayment = null;
});

/* ------------------------------- Stripe ---------------------------------- */

function stripeEvent(sessionId: string, paymentStatus: string): string {
  return JSON.stringify({
    id: "evt_test",
    type: "checkout.session.completed",
    data: { object: { id: sessionId, payment_status: paymentStatus } },
  });
}

function signedStripeRequest(payload: string, secret: string): Request {
  const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
  return new Request("http://localhost/api/payments/stripe/webhook", {
    method: "POST",
    headers: { "stripe-signature": header, "content-type": "application/json" },
    body: payload,
  });
}

test("Stripe : signature absente -> 400, aucune activation", async () => {
  const response = await stripeWebhook(
    new Request("http://localhost/api/payments/stripe/webhook", {
      method: "POST",
      body: stripeEvent("cs_test_1", "paid"),
    }),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(activations, []);
});

test("Stripe : signature INVALIDE -> 400, aucune activation", async () => {
  const payload = stripeEvent("cs_test_1", "paid");
  const response = await stripeWebhook(
    signedStripeRequest(payload, "whsec_mauvais_secret"),
  );
  assert.equal(response.status, 400);
  assert.deepEqual(activations, []);
});

test("Stripe : signature VALIDE + paiement paye -> activation", async () => {
  const payload = stripeEvent("cs_test_1", "paid");
  const response = await stripeWebhook(
    signedStripeRequest(payload, "whsec_pour_les_tests"),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(activations, ["cs_test_1"]);
});

test("Stripe : paiement NON paye -> aucune activation", async () => {
  const payload = stripeEvent("cs_test_2", "unpaid");
  const response = await stripeWebhook(
    signedStripeRequest(payload, "whsec_pour_les_tests"),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(activations, []);
});

/* ---------------------------- Flutterwave -------------------------------- */

function flutterwaveRequest(hash: string, body: unknown): Request {
  return new Request("http://localhost/api/payments/flutterwave/webhook", {
    method: "POST",
    headers: { "verif-hash": hash, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

const FLW_BODY = {
  data: { id: 12345, tx_ref: "flw_ref_1", status: "successful" },
};

test("Flutterwave : verif-hash incorrect -> 401, aucune activation", async () => {
  const response = await flutterwaveWebhook(
    flutterwaveRequest("mauvais-hash", FLW_BODY),
  );
  assert.equal(response.status, 401);
  assert.deepEqual(activations, []);
});

test("Flutterwave : hash correct + transaction verifiee -> activation", async () => {
  flwVerification = {
    status: "successful",
    txRef: "flw_ref_1",
    amount: 6500,
    currency: "XAF",
  };
  pendingPayment = { providerRef: "flw_ref_1", amount: 6500, currency: "XAF" };

  const response = await flutterwaveWebhook(
    flutterwaveRequest("hash-de-test", FLW_BODY),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(activations, ["flw_ref_1"]);
});

test("Flutterwave : montant paye INFERIEUR au du -> aucune activation", async () => {
  flwVerification = {
    status: "successful",
    txRef: "flw_ref_1",
    amount: 100, // le fraudeur a paye 100 au lieu de 6500
    currency: "XAF",
  };
  pendingPayment = { providerRef: "flw_ref_1", amount: 6500, currency: "XAF" };

  const response = await flutterwaveWebhook(
    flutterwaveRequest("hash-de-test", FLW_BODY),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(activations, [], "un montant falsifie ne doit rien crediter");
});

test("Flutterwave : transaction non 'successful' -> aucune activation", async () => {
  flwVerification = {
    status: "failed",
    txRef: "flw_ref_1",
    amount: 6500,
    currency: "XAF",
  };
  pendingPayment = { providerRef: "flw_ref_1", amount: 6500, currency: "XAF" };

  const response = await flutterwaveWebhook(
    flutterwaveRequest("hash-de-test", FLW_BODY),
  );
  assert.equal(response.status, 200);
  assert.deepEqual(activations, []);
});
