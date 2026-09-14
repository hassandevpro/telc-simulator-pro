import { NextResponse } from "next/server";
import { createHmac } from "node:crypto";
import { db } from "@/lib/db";
import { activatePlanByRef } from "@/lib/billing";
import {
  getCamerPayTransaction,
  isCamerPayPaid,
  normalizeCamerPayStatus,
  verifyCamerPaySignature,
} from "@/lib/payments/camerpay";

/**
 * Webhook CamerPay — SEULE voie d'activation d'un plan payé par Mobile Money.
 *
 * Trois gardes, dans cet ordre, et aucune n'est facultative :
 *  1. SIGNATURE : HMAC-SHA256 sur `uuid|invoice_id|status|amount`, comparée à
 *     temps constant. Un webhook non signé ou mal signé ne va pas plus loin.
 *  2. CORRESPONDANCE LOCALE : la facture doit exister chez nous, et si nous
 *     connaissons déjà un transaction_uuid il doit être CELUI reçu.
 *  3. RELECTURE SERVEUR : `GET /api/payment/{uuid}/status` chez CamerPay. Un
 *     `status=completed` dans le corps du webhook ne prouve rien à lui seul ;
 *     seul l'état renvoyé par CamerPay, recroisé avec notre montant et notre
 *     devise, autorise l'activation.
 *
 * L'activation elle-même est déléguée à activatePlanByRef() : son idempotence
 * est structurelle (UPDATE conditionnel sous verrou PostgreSQL), donc deux
 * livraisons — même simultanées — ne créditent qu'une fois. Rien n'est
 * dupliqué ici.
 */

/** Header de signature. NON CONFIRMÉ par la documentation (403) — identifié à l'audit. */
const SIGNATURE_HEADER = "x-camerpay-signature";

/** Corps du callback, lu tel quel : `amount` reste une CHAÎNE (cf. HMAC). */
interface CamerPayCallback {
  uuid: string;
  invoiceId: string;
  status: string;
  amount: string;
}

/**
 * Lit le corps selon son Content-Type RÉEL. CamerPay annonce
 * `application/x-www-form-urlencoded` : on ne suppose donc jamais du JSON.
 * Le JSON reste accepté en repli — leur contrat n'est pas confirmé et un
 * callback légitime ne doit pas être perdu sur un simple en-tête.
 */
function parseCallback(raw: string, contentType: string): CamerPayCallback | null {
  let read: (key: string) => string | null;

  if (contentType.includes("application/json")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return null;
    }
    if (typeof parsed !== "object" || parsed === null) return null;
    const record = parsed as Record<string, unknown>;
    read = (key) => {
      const value = record[key];
      if (typeof value === "string") return value;
      // Un `amount` numérique est re-sérialisé tel quel : c'est la
      // représentation reçue, pas une conversion de notre fait.
      if (typeof value === "number") return String(value);
      return null;
    };
  } else {
    // form-urlencoded (annoncé) et tout autre type : on tente la lecture de
    // formulaire, qui est le format documenté.
    const form = new URLSearchParams(raw);
    read = (key) => form.get(key);
  }

  const uuid = read("uuid");
  const invoiceId = read("invoice_id") ?? read("merchant_invoice_id");
  const status = read("status");
  const amount = read("amount");

  if (!uuid || !invoiceId || !status || amount === null) return null;
  return { uuid, invoiceId, status, amount };
}

/* ═══════════════════════════════════════════════════════════════════════
 * LOGGING TEMPORAIRE — VALIDATION SANDBOX (ÉTAPE 5). À SUPPRIMER ENSUITE.
 *
 * Tout ce bloc, et les appels `trace(...)` de POST, existent uniquement pour
 * OBSERVER le contrat réel de CamerPay, que la documentation (403) ne permet
 * pas de vérifier. Il n'influence AUCUNE décision : le diagnostic d'ordre de
 * signature ci-dessous ne sert qu'à écrire un log — la validation reste
 * verifyCamerPaySignature(), et elle seule.
 *
 * Actif seulement si CAMERPAY_WEBHOOK_TRACE=1 (variable de debug temporaire,
 * à retirer de Vercel après validation). Ne journalise JAMAIS le token, le
 * secret, l'en-tête Authorization, ni la valeur de la signature — seulement
 * sa FORME.
 * ═══════════════════════════════════════════════════════════════════════ */

function tracing(): boolean {
  return process.env.CAMERPAY_WEBHOOK_TRACE === "1";
}

function trace(step: string, data: Record<string, unknown>): void {
  if (!tracing()) return;
  console.info(`[camerpay/webhook][TRACE] ${step}`, JSON.stringify(data));
}

/** Forme de la signature, jamais sa valeur (la journaliser permettrait un rejeu). */
function signatureShape(signature: string | null): Record<string, unknown> {
  if (signature === null) return { present: false };
  return {
    present: true,
    length: signature.length,
    hex: /^[0-9a-f]+$/i.test(signature),
    lowercase: signature === signature.toLowerCase(),
    prefixedSha256: /^sha256=/i.test(signature),
  };
}

/** Noms des champs reçus — les NOMS seuls, jamais les valeurs inconnues. */
function observedKeys(raw: string, contentType: string): string[] {
  try {
    if (contentType.includes("application/json")) {
      const parsed: unknown = JSON.parse(raw);
      return typeof parsed === "object" && parsed !== null
        ? Object.keys(parsed as Record<string, unknown>)
        : [];
    }
    return [...new URLSearchParams(raw).keys()];
  } catch {
    return [];
  }
}

/**
 * Si notre ordre de signature échoue, teste quelques compositions plausibles
 * et dit LAQUELLE correspond. C'est ce qui permet de corriger le contrat sur
 * une observation plutôt que sur une supposition. Ne renvoie qu'un libellé.
 */
function diagnoseSignatureComposition(
  fields: CamerPayCallback,
  raw: string,
  signature: string,
  secret: string,
): string | null {
  const { uuid, invoiceId, status, amount } = fields;
  const candidates: [string, string][] = [
    ["uuid|invoice_id|status|amount", `${uuid}|${invoiceId}|${status}|${amount}`],
    ["invoice_id|uuid|status|amount", `${invoiceId}|${uuid}|${status}|${amount}`],
    ["uuid|invoice_id|amount|status", `${uuid}|${invoiceId}|${amount}|${status}`],
    ["invoice_id|amount|status|uuid", `${invoiceId}|${amount}|${status}|${uuid}`],
    ["amount|status|invoice_id|uuid", `${amount}|${status}|${invoiceId}|${uuid}`],
    ["concat sans separateur", `${uuid}${invoiceId}${status}${amount}`],
    ["corps brut", raw],
  ];

  const provided = signature.trim().replace(/^sha256=/i, "").toLowerCase();
  for (const [label, message] of candidates) {
    const digest = createHmac("sha256", secret).update(message, "utf8").digest("hex");
    if (digest === provided) return label;
  }
  return null;
}

/* ══════════════════ FIN DU BLOC TEMPORAIRE ═══════════════════════════ */

export async function POST(request: Request) {
  // Sans secret configuré, aucune signature n'est vérifiable : on refuse en
  // 5xx (défaut de configuration serveur) plutôt que de laisser passer.
  if (!process.env.CAMERPAY_WEBHOOK_SECRET) {
    console.error("[camerpay/webhook] CAMERPAY_WEBHOOK_SECRET absente");
    return NextResponse.json({ error: "Nicht konfiguriert." }, { status: 500 });
  }

  const raw = await request.text();
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const rawSignature = request.headers.get(SIGNATURE_HEADER);

  trace("1-reception", {
    method: request.method,
    contentType,
    bodyLength: raw.length,
    receivedKeys: observedKeys(raw, contentType),
    signatureHeader: SIGNATURE_HEADER,
    signature: signatureShape(rawSignature),
    // Aide au diagnostic si l'en-tête porte un autre nom que celui attendu.
    allHeaderNames: [...request.headers.keys()].filter(
      (name) => name !== "authorization" && !name.startsWith("cookie"),
    ),
  });

  const callback = parseCallback(raw, contentType);
  if (!callback) {
    trace("2-parse-echec", { contentType });
    return NextResponse.json({ error: "Ungültiger Payload." }, { status: 400 });
  }

  trace("2-champs", {
    uuid: callback.uuid,
    invoice_id: callback.invoiceId,
    status: callback.status,
    amount: callback.amount,
    amountIsString: true,
  });

  // ── Garde 1 : signature ───────────────────────────────────────────────
  // `amount` est passé tel qu'il a été reçu. Le reconvertir en nombre
  // ("5000.00" → 5000) produirait un HMAC différent et casserait la
  // vérification.
  const signed = verifyCamerPaySignature(
    {
      uuid: callback.uuid,
      invoiceId: callback.invoiceId,
      status: callback.status,
      amount: callback.amount,
    },
    rawSignature,
  );
  if (!signed) {
    // Diagnostic PUREMENT INFORMATIF : dit quelle composition aurait
    // correspondu, sans jamais changer l'issue (la réponse reste 401).
    trace("3-hmac", {
      valid: false,
      compositionQuiCorrespond:
        rawSignature && process.env.CAMERPAY_WEBHOOK_SECRET
          ? diagnoseSignatureComposition(
              callback,
              raw,
              rawSignature,
              process.env.CAMERPAY_WEBHOOK_SECRET,
            )
          : null,
    });
    return NextResponse.json({ error: "Signatur ungültig." }, { status: 401 });
  }
  trace("3-hmac", { valid: true, composition: "uuid|invoice_id|status|amount" });

  // ── Garde 2 : la facture doit être la nôtre ───────────────────────────
  // Recherche par invoice_id UNIQUEMENT (= Payment.providerRef). Jamais par
  // montant : deux paiements peuvent partager le même montant.
  const payment = await db.payment.findUnique({
    where: { providerRef: callback.invoiceId },
    select: {
      providerRef: true,
      providerTxId: true,
      amount: true,
      currency: true,
      status: true,
    },
  });
  trace("4-payment", {
    trouve: payment !== null,
    providerTxIdConnu: payment?.providerTxId !== null && payment?.providerTxId !== undefined,
    statutLocal: payment?.status ?? null,
    montantAttendu: payment?.amount ?? null,
    deviseAttendue: payment?.currency ?? null,
  });

  if (!payment) {
    console.warn("[camerpay/webhook] facture inconnue", callback.invoiceId);
    return NextResponse.json({ error: "Unbekannte Rechnung." }, { status: 404 });
  }

  // Un uuid déjà connu ne doit JAMAIS être remplacé par un autre : ce serait
  // le signe d'un rejeu croisé entre deux transactions.
  if (payment.providerTxId && payment.providerTxId !== callback.uuid) {
    console.error(
      "[camerpay/webhook] uuid incohérent pour la facture",
      callback.invoiceId,
    );
    return NextResponse.json({ error: "Transaktion inkonsistent." }, { status: 409 });
  }

  // ── Statuts non payables : accusé de réception, aucun effet ───────────
  const status = normalizeCamerPayStatus(callback.status);
  if (!isCamerPayPaid(status)) {
    if (status === "refunded") {
      // Décision de phase : PAS de révocation automatique. Le remboursement
      // est tracé pour traitement manuel ; `refund:write` n'est pas utilisé.
      console.warn(
        "[camerpay/webhook] remboursement signalé, aucune révocation automatique",
        callback.invoiceId,
      );
    }
    return NextResponse.json({ received: true, activated: false });
  }

  // ── Garde 3 : relecture serveur chez CamerPay ─────────────────────────
  const transaction = await getCamerPayTransaction(callback.uuid);

  trace("5-status", {
    exploitable: transaction !== null,
    // Ce que NOTRE parsing a su extraire. Un champ à null = nom de champ
    // différent de celui attendu → c'est exactement ce qu'on cherche à voir.
    uuid: transaction?.uuid ?? null,
    invoiceId: transaction?.invoiceId ?? null,
    status: transaction?.status ?? null,
    amount: transaction?.amount ?? null,
    currency: transaction?.currency ?? null,
    paymentMethod: transaction?.paymentMethod ?? null,
  });

  if (!transaction) {
    // Injoignable, en erreur, ou corps inexploitable : indécidable. On répond
    // 503 pour que CamerPay puisse rejouer — surtout pas 200, qui clôturerait
    // définitivement un paiement peut-être valide.
    console.error("[camerpay/webhook] /status indisponible", callback.invoiceId);
    return NextResponse.json({ error: "Vorübergehend nicht verfügbar." }, { status: 503 });
  }

  // Le montant attendu vient de NOTRE base (prix serveur), la devise aussi.
  // Un montant supérieur est toléré (le client a payé plus que dû) ; un
  // montant inférieur est un refus net.
  const coherent =
    transaction.uuid === callback.uuid &&
    transaction.invoiceId === payment.providerRef &&
    isCamerPayPaid(transaction.status) &&
    transaction.currency === payment.currency &&
    transaction.amount !== null &&
    transaction.amount >= payment.amount;

  if (!coherent) {
    trace("6-coherence", {
      uuidOk: transaction.uuid === callback.uuid,
      invoiceOk: transaction.invoiceId === payment.providerRef,
      statutPaye: isCamerPayPaid(transaction.status),
      deviseOk: transaction.currency === payment.currency,
      montantOk: transaction.amount !== null && transaction.amount >= payment.amount,
    });
    console.error(
      "[camerpay/webhook] vérification serveur en échec",
      callback.invoiceId,
    );
    return NextResponse.json({ received: true, activated: false });
  }

  // Mémorise le transaction_uuid s'il manquait, sans jamais écraser une
  // valeur existante : l'UPDATE est conditionné à providerTxId NULL.
  if (!payment.providerTxId) {
    await db.payment
      .updateMany({
        where: { providerRef: payment.providerRef, providerTxId: null },
        data: { providerTxId: callback.uuid },
      })
      .catch((cause: unknown) => {
        console.error("[camerpay/webhook] providerTxId non enregistré", cause);
      });
  }

  // Activation — idempotente par construction (cf. lib/billing.ts). Un
  // paiement déjà SUCCESS est un no-op, une facture inconnue renvoie false.
  await activatePlanByRef(payment.providerRef);

  trace("7-final", {
    invoice_id: payment.providerRef,
    active: true,
    // `false` ici signifie « déjà traité » : la seconde livraison d'un même
    // callback ne crédite rien. C'est la preuve d'idempotence à observer.
    premiereActivation: payment.status === "PENDING",
  });

  return NextResponse.json({ received: true, activated: true });
}
