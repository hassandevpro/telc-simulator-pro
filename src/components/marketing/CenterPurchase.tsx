"use client";

import { useState } from "react";
import { Button } from "@/components/ui";

/**
 * Achat du plan Centre en self-service : on choisit un nombre de places
 * (quota d'étudiants) puis on paie par carte (Stripe) ou Mobile Money
 * (Flutterwave). Au succès, l'acheteur devient CENTER_ADMIN (webhook).
 */
export function CenterPurchase() {
  const [seats, setSeats] = useState(10);
  const [busy, setBusy] = useState<"stripe" | "flutterwave" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buy = async (provider: "stripe" | "flutterwave") => {
    setBusy(provider);
    setError(null);
    try {
      const response = await fetch("/api/center/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, seats }),
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
      <Button
        variant="primary"
        className="w-full"
        disabled={busy !== null}
        onClick={() => void buy("stripe")}
      >
        {busy === "stripe" ? "Weiterleitung…" : "Mit Karte zahlen"}
      </Button>
      <Button
        variant="secondary"
        className="w-full"
        disabled={busy !== null}
        onClick={() => void buy("flutterwave")}
      >
        {busy === "flutterwave" ? "Weiterleitung…" : "Mobile Money / Afrika"}
      </Button>
      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}
