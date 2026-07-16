"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { PayablePlan } from "@/config/pricing";

/**
 * Boutons de paiement d'un plan : Stripe (cartes, monde entier) et
 * Flutterwave (Mobile Money Afrique / Cameroun). Non connecté → redirection
 * vers la connexion. En cas de succès d'init, on redirige vers la page de
 * règlement hébergée du prestataire.
 */
export function PlanCheckout({ plan }: { plan: PayablePlan }) {
  const [busy, setBusy] = useState<"stripe" | "flutterwave" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pay = async (provider: "stripe" | "flutterwave") => {
    setBusy(provider);
    setError(null);
    try {
      const response = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
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
      <Button
        variant="primary"
        className="w-full"
        disabled={busy !== null}
        onClick={() => void pay("stripe")}
      >
        {busy === "stripe" ? "Weiterleitung…" : "Mit Karte zahlen"}
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy !== null}
        onClick={() => void pay("flutterwave")}
      >
        {busy === "flutterwave"
          ? "Weiterleitung…"
          : "Mobile Money / Afrika"}
      </Button>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}
