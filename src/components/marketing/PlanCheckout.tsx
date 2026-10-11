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

export function PlanCheckout({
  plan,
  premiumUntil = null,
}: {
  plan: PayablePlan;
  /** Fin du Premium en cours (ms), si actif : Student n'est alors pas proposé. */
  premiumUntil?: number | null;
}) {
  const [busy, setBusy] = useState<Provider | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Révélé seulement si le serveur signale un numéro manquant ou invalide :
  // un compte qui a déjà son téléphone n'a rien à ressaisir.
  const [phoneNeeded, setPhoneNeeded] = useState(false);
  const [phone, setPhone] = useState("");
  // Fin de Premium signalée par le serveur (course : Premium acheté dans un
  // autre onglet depuis le chargement de la page).
  const [blockedUntil, setBlockedUntil] = useState<number | null>(premiumUntil);

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
        code?: string;
        premiumUntil?: number;
      } | null;

      if (response.status === 409 && data?.code === "PREMIUM_ACTIVE") {
        setBlockedUntil(data.premiumUntil ?? Date.now());
        setBusy(null);
        return;
      }
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

  if (plan === "STUDENT" && blockedUntil) {
    return (
      <div className="space-y-2 rounded-sm border border-border bg-surface p-3 text-[12px]">
        <p className="font-semibold text-foreground">
          Sie haben bereits Premium (bis {new Date(blockedUntil).toLocaleDateString("de-DE")}).
        </p>
        <p className="text-muted">
          Student kann während eines aktiven Premium-Abos nicht gekauft werden.
          Verlängern Sie stattdessen Premium, oder wählen Sie Student nach dem
          Ablaufdatum.
        </p>
        <a
          href="#plan-PREMIUM"
          className="inline-flex w-full items-center justify-center rounded-sm bg-accent px-3 py-1.5 text-[13px] font-medium text-white"
        >
          Premium verlängern
        </a>
      </div>
    );
  }

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
