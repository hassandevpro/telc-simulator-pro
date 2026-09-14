import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Intégration CamerPay (REST, sans SDK) — passerelle camerounaise qui agrège
 * elle-même les moyens de paiement (Orange Money, MTN MoMo, cartes…). Nous ne
 * parlons JAMAIS aux opérateurs directement : un seul interlocuteur, CamerPay.
 *
 * Env (jamais de valeur en dur, jamais journalisée) :
 *   CAMERPAY_API_URL        — racine de l'API (défaut : https://camerpay.biz)
 *   CAMERPAY_API_TOKEN      — Bearer, permissions payment:write + payment:read
 *   CAMERPAY_WEBHOOK_SECRET — clé HMAC-SHA256 des callbacks
 *
 * Ce module ne touche NI à la base, NI au billing : il ne fait que parler à
 * CamerPay et vérifier des signatures. Toute décision d'activation appartient
 * à la route webhook, qui seule appelle activatePlanByRef().
 */

const DEFAULT_BASE = "https://camerpay.biz";

/** Délai maximal d'un appel CamerPay. Un webhook ne doit jamais pendre. */
const TIMEOUT_MS = 15_000;

function baseUrl(): string {
  return (process.env.CAMERPAY_API_URL || DEFAULT_BASE).replace(/\/+$/, "");
}

function apiToken(): string {
  const token = process.env.CAMERPAY_API_TOKEN;
  if (!token) throw new Error("CAMERPAY_API_TOKEN manquante.");
  return token;
}

function webhookSecret(): string | null {
  return process.env.CAMERPAY_WEBHOOK_SECRET || null;
}

/* ────────────────────────────── Statuts ────────────────────────────── */

/**
 * Statuts annoncés par CamerPay. `completed` est le SEUL qui ouvre la porte à
 * une activation — et encore, seulement après re-vérification serveur.
 * `refunded` n'est PAS traité en révocation dans cette phase : on le
 * journalise et on n'active rien (décision documentée, à revoir avec
 * refund:write plus tard).
 */
export const CAMERPAY_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "cancelled",
  "refunded",
] as const;

export type CamerPayStatus = (typeof CAMERPAY_STATUSES)[number];

/** Normalise un statut reçu (casse/espaces) sans rien inventer. */
export function normalizeCamerPayStatus(raw: unknown): CamerPayStatus | null {
  if (typeof raw !== "string") return null;
  const value = raw.trim().toLowerCase();
  return (CAMERPAY_STATUSES as readonly string[]).includes(value)
    ? (value as CamerPayStatus)
    : null;
}

/** Un paiement n'est encaissé QUE dans cet état. Aucun autre. */
export function isCamerPayPaid(status: CamerPayStatus | null): boolean {
  return status === "completed";
}

/* ─────────────────────────── Moyen de paiement ─────────────────────── */

/**
 * Seul identifiant de `payment_method` CONFIRMÉ (exemple officiel CamerPay).
 * MTN MoMo est annoncé disponible sur la plateforme mais son identifiant API
 * exact est NON CONFIRMÉ : il sera ajouté quand CamerPay l'aura confirmé, pas
 * deviné.
 */
export const CAMERPAY_PAYMENT_METHOD = "orange_money" as const;

/* ─────────────────────── Numéro du payeur (MSISDN) ─────────────────── */

/**
 * Normalise un numéro camerounais vers le format attendu par CamerPay :
 * 9 chiffres SANS indicatif, tel que "699123456" dans leur exemple officiel.
 *
 * Accepte les formes saisies à l'inscription (`+237 6 99 12 34 56`,
 * `00237699123456`, `699-123-456`) et renvoie null si le résultat n'est pas
 * un mobile camerounais plausible. Renvoyer null, c'est refuser le paiement :
 * mieux vaut un 400 explicite qu'un envoi vers un numéro erroné.
 *
 * Portée volontairement étroite : Orange Money Cameroun. Un numéro étranger
 * est rejeté — l'utilisateur dispose de Stripe pour les cartes.
 */
export function normalizeCameroonMsisdn(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;

  let digits = raw.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("237")) digits = digits.slice(3);

  // Mobiles camerounais : 9 chiffres, tous commencent par 6 depuis 2015.
  return /^6\d{8}$/.test(digits) ? digits : null;
}

/* ──────────────────────────── Initiation ───────────────────────────── */

export interface CamerPayInitParams {
  /** Notre merchant_invoice_id = Payment.providerRef (clé d'idempotence). */
  invoiceId: string;
  /** Montant ENTIER en XAF, calculé côté serveur depuis config/pricing. */
  amount: number;
  /** Numéro local du payeur (9 chiffres, sans indicatif). */
  customerPhone: string;
  /** Moyen choisi chez CamerPay (ex. "orange_money", "mtn_momo"). */
  paymentMethod: string;
  /** Notre webhook — seule source d'activation. */
  callbackUrl: string;
  /** Retour navigateur — n'active JAMAIS rien. */
  returnUrl: string;
}

export interface CamerPayInitResult {
  /** URL de règlement chez CamerPay, si la passerelle en renvoie une. */
  payUrl: string | null;
  /** transaction_uuid CamerPay, à stocker dans Payment.providerTxId. */
  uuid: string | null;
}

/**
 * Ouvre un paiement chez CamerPay et renvoie le lien de règlement.
 *
 * IDEMPOTENCE — la clé envoyée est `invoiceId`, c'est-à-dire notre
 * Payment.providerRef, créé UNE fois avec le Payment PENDING. Elle est donc
 * stable pour une tentative de paiement donnée et ne bouge pas lors d'un
 * retry réseau : rejouer cet appel ne peut pas créer un second paiement.
 * (Le support d'un champ `idempotency_key` dédié par l'API CamerPay est NON
 * CONFIRMÉ ; on ne s'appuie donc pas dessus.)
 */
export async function initiateCamerPayPayment(
  params: CamerPayInitParams,
): Promise<CamerPayInitResult> {
  const response = await fetch(`${baseUrl()}/api/payment/initiate`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiToken()}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({
      payment_method: params.paymentMethod,
      amount: params.amount,
      currency: "XAF",
      customer_phone: params.customerPhone,
      merchant_invoice_id: params.invoiceId,
      merchant_callback_url: params.callbackUrl,
      merchant_return_url: params.returnUrl,
      source: "api",
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  const payload = (await response.json().catch(() => null)) as unknown;
  if (!response.ok) {
    // Le message du prestataire ne doit jamais fuiter un secret ; on ne
    // remonte qu'un libellé court.
    throw new Error(readMessage(payload) ?? "CamerPay-Initialisierung fehlgeschlagen.");
  }

  const record = asRecord(payload);
  const data = asRecord(record?.data) ?? record;
  const result: CamerPayInitResult = {
    payUrl: readPayUrl(data) ?? readPayUrl(record),
    uuid: readUuid(data) ?? readUuid(record),
  };
  if (!result.payUrl && !result.uuid) {
    throw new Error("CamerPay-Initialisierung fehlgeschlagen.");
  }
  return result;
}

/* ─────────────────────── Vérification serveur ──────────────────────── */

export interface CamerPayTransaction {
  uuid: string | null;
  invoiceId: string | null;
  status: CamerPayStatus | null;
  /** Montant tel que renvoyé par CamerPay, converti pour comparaison. */
  amount: number | null;
  currency: string | null;
  paymentMethod: string | null;
}

/**
 * Relit une transaction CHEZ CamerPay. Un webhook, même correctement signé,
 * ne prouve pas l'encaissement : cette lecture est la source de vérité.
 * Renvoie null si CamerPay est injoignable, répond en erreur, ou renvoie un
 * corps inexploitable — l'appelant ne doit alors RIEN activer.
 */
export async function getCamerPayTransaction(
  uuid: string,
): Promise<CamerPayTransaction | null> {
  let response: Response;
  try {
    response = await fetch(
      `${baseUrl()}/api/payment/${encodeURIComponent(uuid)}/status`,
      {
        headers: {
          Authorization: `Bearer ${apiToken()}`,
          Accept: "application/json",
        },
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
  } catch {
    // Timeout ou panne réseau : indécidable, donc aucune activation.
    return null;
  }
  if (!response.ok) return null;

  const payload = (await response.json().catch(() => null)) as unknown;
  const record = asRecord(payload);
  if (!record) return null;

  // Échec applicatif annoncé explicitement : indécidable, donc rien.
  if (record.success === false) return null;

  // La documentation CamerPay décrit DEUX formes pour cette réponse :
  //   - plate      { success, transaction_uuid, status, amount, currency, … }
  //                (schéma OpenAPI « StatusResponse ») ;
  //   - imbriquée  { success, transaction: { uuid, status, amount, currency,
  //                merchant_invoice_id, … } } (page « Endpoints détaillés »).
  // On accepte les deux plutôt que de parier sur l'une : se tromper de forme
  // ne produit pas une erreur visible mais des champs à null, donc un refus
  // d'activer un paiement pourtant légitime — exactement le défaut corrigé ici.
  const data = asRecord(record.transaction) ?? asRecord(record.data) ?? record;

  // Noms de champs volontairement restreints aux DEUX nomenclatures
  // attestées ci-dessus. Cette réponse décide d'une activation : accepter
  // « n'importe quelle structure » laisserait un corps inattendu satisfaire
  // nos contrôles. Un champ absent vaut null, et null n'active jamais rien.
  return {
    // Forme plate : `transaction_uuid`. Forme imbriquée : `uuid`.
    uuid: readString(data, ["transaction_uuid", "uuid"]),
    // Présent uniquement dans la forme imbriquée — d'où le contrôle
    // conditionnel côté webhook (voir la garde de cohérence).
    invoiceId: readString(data, ["merchant_invoice_id", "invoice_id"]),
    status: normalizeCamerPayStatus(data.status),
    amount: readAmount(data.amount),
    currency: readString(data, ["currency"])?.toUpperCase() ?? null,
    paymentMethod: readString(data, ["payment_method"]),
  };
}

/* ───────────────────────────── Signature ───────────────────────────── */

export interface CamerPaySignaturePayload {
  uuid: string;
  invoiceId: string;
  status: string;
  /** Montant EXACTEMENT tel que reçu (chaîne brute, jamais reconverti). */
  amount: string;
}

/**
 * Chaîne signée par CamerPay : `uuid|invoice_id|status|amount`.
 *
 * `amount` reste la CHAÎNE reçue : "5000", "5000.00" et "5 000" ne produisent
 * pas le même HMAC, et toute normalisation numérique de notre côté casserait
 * la vérification.
 */
export function camerPaySignatureBase(payload: CamerPaySignaturePayload): string {
  return [payload.uuid, payload.invoiceId, payload.status, payload.amount].join("|");
}

/**
 * Vérifie la signature HMAC-SHA256 d'un callback CamerPay.
 *
 * Défenses :
 *  - secret absent → refus (jamais de webhook accepté sans secret configuré) ;
 *  - signature absente ou vide → refus ;
 *  - LONGUEURS COMPARÉES AVANT timingSafeEqual : cette fonction lève une
 *    RangeError sur des tampons de tailles différentes, et un webhook forgé
 *    avec une signature courte ferait alors planter la route (500) au lieu
 *    d'un refus propre ;
 *  - comparaison à temps constant (pas de `===`) ;
 *  - casse hexadécimale indifférente.
 *
 * NON CONFIRMÉ : le nom exact du header (`X-CamerPay-Signature` d'après
 * l'audit) et l'éventuel préfixe `sha256=`. Le préfixe est toléré ici — il
 * n'affaiblit rien et évite de rejeter un callback légitime.
 */
export function verifyCamerPaySignature(
  payload: CamerPaySignaturePayload,
  signature: string | null | undefined,
  secret: string | null = webhookSecret(),
): boolean {
  if (!secret) return false;
  if (typeof signature !== "string") return false;

  const provided = signature.trim().replace(/^sha256=/i, "").toLowerCase();
  if (provided.length === 0) return false;

  const expected = createHmac("sha256", secret)
    .update(camerPaySignatureBase(payload), "utf8")
    .digest("hex");

  // Garde-fou anti-RangeError : timingSafeEqual EXIGE la même longueur.
  if (provided.length !== expected.length) return false;

  return timingSafeEqual(Buffer.from(provided, "utf8"), Buffer.from(expected, "utf8"));
}

/* ───────────────────────── Lecture défensive ───────────────────────── */
/*
 * Les noms de champs exacts des réponses CamerPay sont NON CONFIRMÉS (doc web
 * en 403). On lit donc plusieurs alias plausibles plutôt que d'en inventer un
 * seul : un champ absent vaut null, et null ne peut jamais activer un plan.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function readString(
  source: Record<string, unknown>,
  keys: readonly string[],
): string | null {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim() !== "") return value.trim();
    if (typeof value === "number") return String(value);
  }
  return null;
}

function readPayUrl(source: Record<string, unknown> | null): string | null {
  if (!source) return null;
  const url = readString(source, [
    "pay_url",
    "payment_url",
    "redirect_url",
    "checkout_url",
    "url",
    "link",
  ]);
  // Seul un lien HTTPS est renvoyé au navigateur.
  return url && /^https:\/\//i.test(url) ? url : null;
}

function readUuid(source: Record<string, unknown> | null): string | null {
  if (!source) return null;
  return readString(source, ["uuid", "transaction_uuid", "transactionUuid", "id"]);
}

/** Montant → nombre pour COMPARAISON uniquement (jamais pour la signature). */
function readAmount(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;
  const parsed = Number(value.replace(/\s/g, ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function readMessage(payload: unknown): string | null {
  const record = asRecord(payload);
  if (!record) return null;
  const message = record.message ?? record.error;
  return typeof message === "string" && message.trim() !== "" ? message.trim() : null;
}
