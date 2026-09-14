/**
 * Webhook CamerPay — la SEULE voie d'activation d'un paiement Mobile Money.
 *
 * Execution :
 *   npm test
 *
 * CE QUI EST REEL ICI, ET POURQUOI : la signature HMAC et le client
 * /status ne sont PAS doubles. Seuls `fetch` (donc la reponse de CamerPay),
 * la base et l'activation le sont. Un test qui simulerait la verification de
 * signature ne prouverait rien sur la verification de signature.
 *
 * Le double d'activatePlanByRef reproduit le CONTRAT du vrai (lib/billing.ts)
 * : la transition PENDING -> SUCCESS y est atomique — aucune cesure `await`
 * entre la lecture du statut et son ecriture. C'est ce qui rend le test de
 * concurrence significatif.
 */
import { test, before, beforeEach, mock } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";

const SECRET = "secret-hmac-de-test";
process.env.CAMERPAY_WEBHOOK_SECRET = SECRET;
process.env.CAMERPAY_API_TOKEN = "token-sandbox-de-test";
process.env.CAMERPAY_API_URL = "https://camerpay.test";

const UUID = "8f14e45f-ea8f-4b2a-9c1d-000000000001";
const INVOICE = "cmp_facture_1";
const AMOUNT = 6500;

/* --------------------------- Doubles de base ----------------------------- */

interface FakePayment {
  providerRef: string;
  providerTxId: string | null;
  amount: number;
  currency: string;
  status: string;
}

let payment: FakePayment | null = null;
/** References passees a activatePlanByRef — la trace des appels. */
const activations: string[] = [];
/** Nombre d'octrois REELS de droits. Doit rester <= 1 par paiement. */
let credited = 0;

mock.module("@/lib/db", {
  namedExports: {
    db: {
      payment: {
        findUnique: async ({ where }: { where: { providerRef: string } }) =>
          payment && payment.providerRef === where.providerRef
            ? { ...payment }
            : null,
        updateMany: async ({
          where,
          data,
        }: {
          where: { providerRef: string; providerTxId: null };
          data: { providerTxId: string };
        }) => {
          if (
            payment &&
            payment.providerRef === where.providerRef &&
            payment.providerTxId === null
          ) {
            payment.providerTxId = data.providerTxId;
            return { count: 1 };
          }
          return { count: 0 };
        },
      },
    },
  },
});

mock.module("@/lib/billing", {
  namedExports: {
    // Contrat du vrai activatePlanByRef : reference inconnue -> false ;
    // paiement deja traite -> true SANS effet ; sinon reservation atomique
    // puis octroi. Aucun `await` entre le test du statut et son ecriture.
    activatePlanByRef: async (providerRef: string) => {
      activations.push(providerRef);
      if (!payment || payment.providerRef !== providerRef) return false;
      if (payment.status !== "PENDING") return true;
      payment.status = "SUCCESS";
      credited += 1;
      return true;
    },
  },
});

/* ------------------------ Double de CamerPay /status --------------------- */

let statusHandler: () => Promise<Response>;

function statusResponse(overrides: Record<string, unknown> = {}): Response {
  return new Response(
    JSON.stringify({
      data: {
        uuid: UUID,
        merchant_invoice_id: INVOICE,
        status: "completed",
        amount: "6500",
        currency: "XAF",
        payment_method: "orange_money",
        ...overrides,
      },
    }),
    { status: 200, headers: { "content-type": "application/json" } },
  );
}

globalThis.fetch = (async () => statusHandler()) as typeof fetch;

/* ------------------------------- Harnais --------------------------------- */

let webhook: (request: Request) => Promise<Response>;

before(async () => {
  webhook = (await import("@/app/api/payments/camerpay/webhook/route")).POST;
});

beforeEach(() => {
  payment = {
    providerRef: INVOICE,
    providerTxId: null,
    amount: AMOUNT,
    currency: "XAF",
    status: "PENDING",
  };
  activations.length = 0;
  credited = 0;
  statusHandler = async () => statusResponse();
  process.env.CAMERPAY_WEBHOOK_SECRET = SECRET;
});

interface CallbackFields {
  uuid?: string;
  invoiceId?: string;
  status?: string;
  amount?: string;
}

function sign(fields: Required<CallbackFields>): string {
  return createHmac("sha256", SECRET)
    .update(`${fields.uuid}|${fields.invoiceId}|${fields.status}|${fields.amount}`)
    .digest("hex");
}

/**
 * Construit un callback CamerPay. Par defaut : form-urlencoded, statut
 * `completed`, signature VALIDE. `signature: null` retire l'en-tete.
 */
function callback(
  fields: CallbackFields = {},
  options: { signature?: string | null; contentType?: string; body?: string } = {},
): Request {
  const full = {
    uuid: fields.uuid ?? UUID,
    invoiceId: fields.invoiceId ?? INVOICE,
    status: fields.status ?? "completed",
    amount: fields.amount ?? "6500",
  };

  const contentType = options.contentType ?? "application/x-www-form-urlencoded";
  const body =
    options.body ??
    (contentType.includes("json")
      ? JSON.stringify({
          uuid: full.uuid,
          invoice_id: full.invoiceId,
          status: full.status,
          amount: full.amount,
        })
      : new URLSearchParams({
          uuid: full.uuid,
          invoice_id: full.invoiceId,
          status: full.status,
          amount: full.amount,
        }).toString());

  const headers: Record<string, string> = { "content-type": contentType };
  const signature =
    options.signature === undefined ? sign(full) : options.signature;
  if (signature !== null) headers["x-camerpay-signature"] = signature;

  return new Request("http://localhost/api/payments/camerpay/webhook", {
    method: "POST",
    headers,
    body,
  });
}

/* =========================== 1. Format du corps =========================== */

test("form-urlencoded valide + completed -> activation unique", async () => {
  const response = await webhook(callback());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, activated: true });
  assert.deepEqual(activations, [INVOICE]);
  assert.equal(credited, 1);
});

test("JSON accepte en repli (Content-Type non confirme) -> activation", async () => {
  const response = await webhook(callback({}, { contentType: "application/json" }));
  assert.equal(response.status, 200);
  assert.equal(credited, 1);
});

test("corps illisible -> 400, aucune activation", async () => {
  const response = await webhook(
    callback({}, { contentType: "text/plain", body: "n'importe quoi" }),
  );
  assert.equal(response.status, 400);
  assert.equal(credited, 0);
});

test("champ obligatoire manquant -> 400, aucune activation", async () => {
  const body = new URLSearchParams({ uuid: UUID, status: "completed" }).toString();
  const response = await webhook(callback({}, { body }));
  assert.equal(response.status, 400);
  assert.equal(credited, 0);
});

/* ============================ 2. Signature HMAC =========================== */

test("signature ABSENTE -> 401, aucune activation", async () => {
  const response = await webhook(callback({}, { signature: null }));
  assert.equal(response.status, 401);
  assert.equal(credited, 0);
});

test("signature INVALIDE (bonne longueur) -> 401, aucune activation", async () => {
  const response = await webhook(callback({}, { signature: "a".repeat(64) }));
  assert.equal(response.status, 401);
  assert.equal(credited, 0);
});

test("signature TROP COURTE -> 401 et non 500 (pas de RangeError)", async () => {
  const response = await webhook(callback({}, { signature: "abcd" }));
  assert.equal(response.status, 401, "une signature courte ne doit pas faire planter la route");
  assert.equal(credited, 0);
});

test("signature TROP LONGUE -> 401 et non 500", async () => {
  const response = await webhook(callback({}, { signature: "a".repeat(200) }));
  assert.equal(response.status, 401);
  assert.equal(credited, 0);
});

test("signature MALFORMEE (non hexadecimale) -> 401", async () => {
  const response = await webhook(callback({}, { signature: "z".repeat(64) }));
  assert.equal(response.status, 401);
  assert.equal(credited, 0);
});

test("signature vide -> 401", async () => {
  const response = await webhook(callback({}, { signature: "   " }));
  assert.equal(response.status, 401);
  assert.equal(credited, 0);
});

test("signature en MAJUSCULES -> acceptee (casse hexadecimale indifferente)", async () => {
  const valid = sign({ uuid: UUID, invoiceId: INVOICE, status: "completed", amount: "6500" });
  const response = await webhook(callback({}, { signature: valid.toUpperCase() }));
  assert.equal(response.status, 200);
  assert.equal(credited, 1);
});

test("CANARI : amount converti en Number avant signature -> refus", async () => {
  // Le callback porte "6500.00" ; on signe la forme numerique "6500".
  const wrong = sign({
    uuid: UUID,
    invoiceId: INVOICE,
    status: "completed",
    amount: String(Number("6500.00")),
  });
  const response = await webhook(
    callback({ amount: "6500.00" }, { signature: wrong }),
  );
  assert.equal(
    response.status,
    401,
    "la signature doit porter sur la CHAINE amount recue, pas sur sa valeur numerique",
  );
  assert.equal(credited, 0);
});

test("secret ABSENT -> 500, aucune activation", async () => {
  delete process.env.CAMERPAY_WEBHOOK_SECRET;
  try {
    const response = await webhook(callback());
    assert.equal(response.status, 500);
    assert.equal(credited, 0);
  } finally {
    process.env.CAMERPAY_WEBHOOK_SECRET = SECRET;
  }
});

/* ========================== 3. Recherche du Payment ======================= */

test("invoice_id INCONNU -> 404, aucune activation", async () => {
  payment = null;
  const response = await webhook(callback({ invoiceId: "cmp_inexistante" }));
  assert.equal(response.status, 404);
  assert.deepEqual(activations, []);
  assert.equal(credited, 0);
});

test("uuid different du providerTxId deja connu -> 409, aucune activation", async () => {
  payment!.providerTxId = "un-tout-autre-uuid";
  const response = await webhook(callback());
  assert.equal(response.status, 409);
  assert.equal(credited, 0);
  assert.equal(
    payment!.providerTxId,
    "un-tout-autre-uuid",
    "un providerTxId existant ne doit jamais etre ecrase",
  );
});

test("providerTxId NULL -> enregistre le uuid recu", async () => {
  await webhook(callback());
  assert.equal(payment!.providerTxId, UUID);
});

/* =============================== 4. Statuts =============================== */

for (const status of ["pending", "processing", "failed", "cancelled"]) {
  test(`statut '${status}' -> 200, aucune activation`, async () => {
    const response = await webhook(callback({ status }));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { received: true, activated: false });
    assert.deepEqual(activations, []);
    assert.equal(credited, 0);
  });
}

test("statut 'refunded' -> 200, aucune activation ET aucune revocation", async () => {
  payment!.status = "SUCCESS"; // plan deja actif
  const response = await webhook(callback({ status: "refunded" }));
  assert.equal(response.status, 200);
  assert.deepEqual(activations, []);
  assert.equal(payment!.status, "SUCCESS", "aucune revocation automatique a cette etape");
});

test("statut inconnu -> 200, aucune activation", async () => {
  const response = await webhook(callback({ status: "quelque_chose" }));
  assert.equal(response.status, 200);
  assert.equal(credited, 0);
});

/* ====================== 5. Verification serveur /status =================== */

test("uuid inconnu chez CamerPay (404) -> 503, aucune activation", async () => {
  statusHandler = async () => new Response("", { status: 404 });
  const response = await webhook(callback());
  assert.equal(response.status, 503);
  assert.equal(credited, 0);
});

test("erreur CamerPay /status (500) -> 503 pour permettre un rejeu", async () => {
  statusHandler = async () => new Response("", { status: 500 });
  const response = await webhook(callback());
  assert.equal(response.status, 503);
  assert.equal(credited, 0);
});

test("timeout /status -> 503, aucune activation", async () => {
  statusHandler = async () => {
    throw new DOMException("The operation was aborted", "TimeoutError");
  };
  const response = await webhook(callback());
  assert.equal(response.status, 503);
  assert.equal(credited, 0);
});

test("/status renvoie un corps inexploitable -> 503", async () => {
  statusHandler = async () =>
    new Response("<html>403</html>", {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  const response = await webhook(callback());
  assert.equal(response.status, 503);
  assert.equal(credited, 0);
});

test("/status non 'completed' malgre un webhook 'completed' -> aucune activation", async () => {
  statusHandler = async () => statusResponse({ status: "pending" });
  const response = await webhook(callback());
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { received: true, activated: false });
  assert.equal(credited, 0);
});

test("/status : montant INFERIEUR au du -> aucune activation", async () => {
  statusHandler = async () => statusResponse({ amount: "100" });
  await webhook(callback());
  assert.equal(credited, 0, "un montant falsifie ne doit rien crediter");
});

test("/status : montant superieur au du -> activation (client ayant trop paye)", async () => {
  statusHandler = async () => statusResponse({ amount: "7000" });
  await webhook(callback());
  assert.equal(credited, 1);
});

test("/status : devise incorrecte -> aucune activation", async () => {
  statusHandler = async () => statusResponse({ currency: "EUR" });
  await webhook(callback());
  assert.equal(credited, 0);
});

test("/status : invoice_id incoherent -> aucune activation", async () => {
  statusHandler = async () => statusResponse({ merchant_invoice_id: "cmp_autre" });
  await webhook(callback());
  assert.equal(credited, 0);
});

test("/status : uuid incoherent -> aucune activation", async () => {
  statusHandler = async () => statusResponse({ uuid: "un-autre-uuid" });
  await webhook(callback());
  assert.equal(credited, 0);
});

/* ============================ 6. Idempotence ============================== */

test("webhook IDENTIQUE rejoue -> un seul octroi de droits", async () => {
  const first = await webhook(callback());
  const second = await webhook(callback());
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);
  assert.equal(activations.length, 2, "les deux livraisons sont bien traitees");
  assert.equal(credited, 1, "mais une seule cree des droits");
});

test("deux webhooks SIMULTANES -> un seul octroi de droits", async () => {
  const [a, b] = await Promise.all([webhook(callback()), webhook(callback())]);
  assert.equal(a.status, 200);
  assert.equal(b.status, 200);
  assert.equal(credited, 1);
});

test("Payment deja SUCCESS -> no-op, aucun second credit", async () => {
  payment!.status = "SUCCESS";
  const response = await webhook(callback());
  assert.equal(response.status, 200);
  assert.deepEqual(activations, [INVOICE]);
  assert.equal(credited, 0);
});

/* ============ 7. Logging de diagnostic (temporaire, ETAPE 5) ============== */

test("trace activee : le comportement est INCHANGE sur un callback valide", async () => {
  process.env.CAMERPAY_WEBHOOK_TRACE = "1";
  try {
    const response = await webhook(callback());
    assert.equal(response.status, 200);
    assert.equal(credited, 1);
  } finally {
    delete process.env.CAMERPAY_WEBHOOK_TRACE;
  }
});

test("trace activee : une signature d'un AUTRE ordre reste REJETEE", async () => {
  // Le diagnostic sait reconnaitre cette composition — il doit se contenter
  // de l'ecrire dans un log, jamais de laisser passer le callback.
  const autreOrdre = createHmac("sha256", SECRET)
    .update(`${INVOICE}|${UUID}|completed|6500`)
    .digest("hex");

  process.env.CAMERPAY_WEBHOOK_TRACE = "1";
  try {
    const response = await webhook(callback({}, { signature: autreOrdre }));
    assert.equal(response.status, 401, "le diagnostic ne doit JAMAIS valider");
    assert.equal(credited, 0);
    assert.deepEqual(activations, []);
  } finally {
    delete process.env.CAMERPAY_WEBHOOK_TRACE;
  }
});

/* ===================== 8. Garantie transversale =========================== */

test("AUCUN webhook non authentifie ne peut activer un plan", async () => {
  const forges = [
    callback({}, { signature: null }),
    callback({}, { signature: "" }),
    callback({}, { signature: "0".repeat(64) }),
    callback({}, { signature: "deadbeef" }),
    callback({ amount: "1" }, { signature: "a".repeat(64) }),
    callback({ status: "completed", invoiceId: INVOICE }, { signature: "sha256=faux" }),
  ];

  for (const request of forges) {
    const response = await webhook(request);
    assert.ok(
      response.status === 401 || response.status === 400,
      `un callback forge doit etre rejete (recu ${response.status})`,
    );
  }
  assert.deepEqual(activations, []);
  assert.equal(credited, 0);
  assert.equal(payment!.status, "PENDING");
});
