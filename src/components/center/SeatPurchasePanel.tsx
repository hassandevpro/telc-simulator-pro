"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui";

/**
 * Achat de sièges de centre : nombre de places, choix « renouveler » /
 * « ajouter » quand des sièges sont déjà actifs, prix et période annoncés par
 * le SERVEUR (/api/center/quote — même calcul que le paiement), puis choix du
 * prestataire. Aucun montant n'est calculé dans le navigateur.
 */

type Provider = "stripe" | "camerpay" | "flutterwave";
type Mode = "renew" | "add";

interface Quote {
  needsMode: boolean;
  activeEnd?: number;
  lastEnd?: number;
  mode?: "NEW" | "RENEW" | "ADD";
  amountXaf?: number;
  amountEur?: number;
  startsAt?: number;
  expiresAt?: number;
  billedDays?: number;
  credits?: number;
  creditsAt?: number;
  creditsDeferred?: boolean;
  blocked?: boolean;
  message?: string;
}

/** Échéances « sans échéance » (droits historiques, 2099) : affichées telles quelles. */
const date = (ms: number) =>
  new Date(ms).getUTCFullYear() >= 2099 ? "unbefristet" : new Date(ms).toLocaleDateString("de-DE");
const xaf = (value: number) => `${value.toLocaleString("fr-FR")} FCFA`;
const eur = (value: number) => `${value.toFixed(2).replace(".", ",")} €`;

export function SeatPurchasePanel({ initialSeats = 10 }: { initialSeats?: number }) {
  const [seats, setSeats] = useState(initialSeats);
  const [mode, setMode] = useState<Mode | null>(null);
  const [loaded, setLoaded] = useState<{ key: string; quote: Quote | null }>({
    key: "",
    quote: null,
  });
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);

  const key = `${seats}|${mode ?? ""}`;

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      const query = new URLSearchParams({ seats: String(seats) });
      if (mode) query.set("mode", mode);
      try {
        const response = await fetch(`/api/center/quote?${query.toString()}`);
        const quote = response.ok ? ((await response.json()) as Quote) : null;
        if (!cancelled) setLoaded({ key, quote });
      } catch {
        if (!cancelled) setLoaded({ key, quote: null });
      }
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [seats, mode, key]);

  const quote = loaded.key === key ? loaded.quote : null;
  const waiting = loaded.key !== key;
  const mustChoose = quote?.needsMode === true && mode === null;
  const canPay =
    Boolean(quote) && !quote?.needsMode && !quote?.blocked && busy === null && !waiting;

  const buy = async (provider: Provider) => {
    setBusy(provider);
    setError(null);
    try {
      const response = await fetch(
        provider === "camerpay" ? "/api/payments/camerpay" : "/api/center/checkout",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            provider === "camerpay"
              ? { plan: "CENTER", seats, ...(mode ? { mode } : {}) }
              : { provider, seats, ...(mode ? { mode } : {}) },
          ),
        },
      );
      if (response.status === 401) {
        window.location.href = "/login?callbackUrl=/pricing";
        return;
      }
      const data = (await response.json().catch(() => null)) as {
        url?: string;
        error?: string;
      } | null;
      if (!response.ok || !data?.url) {
        setError(data?.error ?? "Zahlung nicht möglich.");
        setBusy(null);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Zahlung nicht möglich.");
      setBusy(null);
    }
  };

  return (
    <div className="space-y-2">
      <label className="block text-[12px] text-muted">
        Anzahl Plätze (Studierende)
        <input
          type="number"
          min={1}
          max={500}
          value={seats}
          onChange={(event) => setSeats(Math.max(1, Number(event.target.value) || 1))}
          className="mt-1 w-full border border-border bg-background px-2 py-1.5 text-[13px] text-foreground rounded-sm"
        />
      </label>

      {quote?.needsMode ? (
        <fieldset className="space-y-1.5 rounded-sm border border-border p-2.5">
          <legend className="px-1 text-[12px] text-muted">
            Ihr Zentrum hat aktive Plätze bis {date(quote.activeEnd!)}
          </legend>
          <label className="flex cursor-pointer items-start gap-2 text-[12px]">
            <input
              type="radio"
              name="seat-mode"
              checked={mode === "renew"}
              onChange={() => setMode("renew")}
              className="mt-0.5"
            />
            <span>
              <strong>Nächste Periode verlängern</strong> — beginnt am{" "}
              {date(quote.lastEnd!)}, 30 Tage, voller Preis.
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-2 text-[12px]">
            <input
              type="radio"
              name="seat-mode"
              checked={mode === "add"}
              onChange={() => setMode("add")}
              className="mt-0.5"
            />
            <span>
              <strong>Zusätzliche Plätze</strong> — ab heute bis {date(quote.activeEnd!)},
              anteilig berechnet.
            </span>
          </label>
        </fieldset>
      ) : null}

      {quote?.blocked ? (
        <p className="rounded-sm border border-border bg-surface p-2.5 text-[12px] text-muted">
          {quote.message}
        </p>
      ) : null}

      {quote && !quote.needsMode && !quote.blocked ? (
        <div className="rounded-sm border border-border bg-surface p-2.5 text-[12px]">
          <p className="text-[14px] font-semibold tabular-nums">
            {xaf(quote.amountXaf!)}{" "}
            <span className="text-[12px] font-normal text-muted">≈ {eur(quote.amountEur!)}</span>
          </p>
          <p className="mt-1 text-muted">
            {quote.mode === "ADD"
              ? `${seats} zusätzliche Plätze von heute bis ${date(quote.expiresAt!)} (${quote.billedDays} Tage, anteilig).`
              : quote.mode === "RENEW"
                ? `${seats} Plätze vom ${date(quote.startsAt!)} bis ${date(quote.expiresAt!)} (30 Tage).`
                : `${seats} Plätze für 30 Tage ab heute (bis ${date(quote.expiresAt!)}).`}
            {" "}
            {quote.credits} Credits werden dem Pool{" "}
            {quote.creditsDeferred && quote.creditsAt
              ? `zu Beginn der neuen Periode (${date(quote.creditsAt)}) gutgeschrieben.`
              : "sofort gutgeschrieben."}
          </p>
        </div>
      ) : null}
      {mustChoose ? (
        <p className="text-[12px] text-muted">Bitte eine Option wählen, um den Preis zu sehen.</p>
      ) : null}
      {waiting && !mustChoose ? <p className="text-[12px] text-muted">Preis wird berechnet…</p> : null}

      <Button variant="primary" className="w-full" disabled={!canPay} onClick={() => void buy("stripe")}>
        {busy === "stripe" ? "Weiterleitung…" : "Mit Karte zahlen"}
      </Button>
      <Button variant="secondary" className="w-full" disabled={!canPay} onClick={() => void buy("camerpay")}>
        {busy === "camerpay" ? "Weiterleitung…" : "Orange Money (Kamerun)"}
      </Button>
      <Button variant="secondary" className="w-full" disabled={!canPay} onClick={() => void buy("flutterwave")}>
        {busy === "flutterwave" ? "Weiterleitung…" : "Mobile Money / Afrika"}
      </Button>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}
