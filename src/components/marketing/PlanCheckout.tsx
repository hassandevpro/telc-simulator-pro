"use client";

import { useState } from "react";
import { Button } from "@/components/ui";
import type { PayablePlan } from "@/config/pricing";

/**
 * Boutons de paiement d'un plan : Stripe (cartes, monde entier),
 * CamerPay (Orange Money Cameroun, facturé en FCFA) et Flutterwave
 * (Mobile Money Afrique). Non connecté → redirection vers la connexion.
 * En cas de succès d'init, on redirige vers la page de règlement hébergée
 * du prestataire.
 *
 * Aucun de ces boutons n'active quoi que ce soit : l'activation appartient
 * exclusivement aux webhooks, après vérification serveur.
 */

type Provider = "stripe" | "camerpay" | "flutterwave";

/** CamerPay exige un numéro camerounais ; les autres prestataires non. */
const PHONE_ERROR_HINT = "Telefonnummer";

export function PlanCheckout({ plan }: { plan: PayablePlan }) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Révélé seulement si le serveur signale un numéro manquant ou invalide :
  // un compte qui a déjà son téléphone n'a rien à ressaisir.
  const [phoneNeeded, setPhoneNeeded] = useState(false);
  const [phone, setPhone] = useState("");

  const pay = async (provider: Provider) => {
    setBusy(provider);
    setError(null);
    try {
      const response = await fetch(`/api/payments/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          // Le numéro n'est envoyé que s'il a été saisi ; sinon le serveur
          // retombe sur User.phone.
          ...(provider === "camerpay" && phone.trim()
            ? { phone: phone.trim() }
            : {}),
        }),
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
        const message = data?.error ?? "Zahlung nicht möglich.";
        // Numéro manquant ou mal formé : on ouvre le champ au lieu de
        // laisser l'utilisateur devant une impasse.
        if (provider === "camerpay" && message.includes(PHONE_ERROR_HINT)) {
          setPhoneNeeded(true);
        }
        setError(message);
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
        onClick={() => void pay("camerpay")}
      >
        {busy === "camerpay" ? "Weiterleitung…" : "Orange Money (Kamerun)"}
      </Button>

      {phoneNeeded ? (
        <label className="block text-[12px] text-muted">
          Orange-Money-Nummer (9 Ziffern)
          <input
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
            placeholder="6XXXXXXXX"
            className="mt-1 w-full rounded-sm border border-border bg-background px-2 py-1 text-[13px] text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
          />
        </label>
      ) : null}

      <Button
        variant="secondary"
        className="w-full"
        disabled={busy !== null}
        onClick={() => void pay("flutterwave")}
      >
        {busy === "flutterwave" ? "Weiterleitung…" : "Mobile Money / Afrika"}
      </Button>

      {error ? <p className="text-[12px] text-danger">{error}</p> : null}
    </div>
  );
}
