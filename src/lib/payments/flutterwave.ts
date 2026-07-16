import "server-only";

/**
 * Intégration Flutterwave (REST, sans SDK) — couvre le Mobile Money
 * d'Afrique (Cameroun MTN/Orange, etc.), les cartes et d'autres moyens
 * locaux. Env : FLW_SECRET_KEY (init + vérification), FLW_SECRET_HASH
 * (signature des webhooks).
 */

const BASE = "https://api.flutterwave.com/v3";

function secretKey(): string {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY manquante.");
  return key;
}

export interface FlutterwaveInitParams {
  txRef: string;
  amount: number;
  currency: string;
  redirectUrl: string;
  email: string;
  name: string;
  meta: Record<string, string>;
}

/** Crée un paiement hébergé (Standard) et renvoie le lien de règlement. */
export async function createFlutterwavePayment(
  params: FlutterwaveInitParams,
): Promise<string> {
  const response = await fetch(`${BASE}/payments`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      tx_ref: params.txRef,
      amount: params.amount,
      currency: params.currency,
      redirect_url: params.redirectUrl,
      customer: { email: params.email, name: params.name },
      meta: params.meta,
      // Large éventail de moyens locaux africains + cartes.
      payment_options:
        "card,mobilemoneyfranco,mobilemoneyghana,mobilemoneyuganda,mobilemoneyrwanda,mobilemoneyzambia,mobilemoneytanzania,ussd,banktransfer,barter",
      customizations: {
        title: "TELC Simulator Pro",
        description: "Zugang zu den Modelltests",
      },
    }),
  });
  const data = (await response.json().catch(() => null)) as {
    status?: string;
    message?: string;
    data?: { link?: string };
  } | null;
  if (!response.ok || data?.status !== "success" || !data.data?.link) {
    throw new Error(data?.message ?? "Flutterwave-Initialisierung fehlgeschlagen.");
  }
  return data.data.link;
}

export interface FlutterwaveVerification {
  status: string;
  txRef: string;
  amount: number;
  currency: string;
}

/** Vérifie une transaction côté serveur (jamais se fier au seul webhook). */
export async function verifyFlutterwaveTransaction(
  transactionId: string,
): Promise<FlutterwaveVerification | null> {
  const response = await fetch(
    `${BASE}/transactions/${transactionId}/verify`,
    { headers: { Authorization: `Bearer ${secretKey()}` } },
  );
  const data = (await response.json().catch(() => null)) as {
    status?: string;
    data?: {
      status?: string;
      tx_ref?: string;
      amount?: number;
      currency?: string;
    };
  } | null;
  if (!response.ok || data?.status !== "success" || !data.data) return null;
  return {
    status: data.data.status ?? "",
    txRef: data.data.tx_ref ?? "",
    amount: data.data.amount ?? 0,
    currency: data.data.currency ?? "",
  };
}
