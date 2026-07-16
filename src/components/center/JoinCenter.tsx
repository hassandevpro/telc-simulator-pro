"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Card } from "@/components/ui";

/**
 * Adhésion d'un étudiant à un centre. Utilisé avec une clé pré-remplie
 * (lien /join/<clé>) ou en saisie manuelle (/join).
 */
export function JoinCenter({
  code = "",
  centerName,
}: {
  code?: string;
  centerName?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(code);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const join = async () => {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/center/join", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code: value.trim() }),
    });
    if (response.status === 401) {
      window.location.href = `/login?callbackUrl=/join/${encodeURIComponent(value.trim())}`;
      return;
    }
    const data = (await response.json().catch(() => null)) as {
      ok?: boolean;
      centerName?: string;
      error?: string;
    } | null;
    if (!response.ok || !data?.ok) {
      setError(data?.error ?? "Beitritt fehlgeschlagen.");
      setBusy(false);
      return;
    }
    setDone(data.centerName ?? centerName ?? null);
    setBusy(false);
    router.refresh();
  };

  if (done !== null) {
    return (
      <Card className="max-w-md p-5">
        <h2 className="text-[15px] font-semibold">Beigetreten</h2>
        <p className="mt-2 text-[13px] text-muted">
          Sie sind dem Zentrum{done ? ` „${done}“` : ""} beigetreten und haben
          jetzt Zugriff auf die Modelltests.
        </p>
        <Button
          variant="primary"
          className="mt-4"
          onClick={() => router.push("/dashboard")}
        >
          Zur Übersicht
        </Button>
      </Card>
    );
  }

  return (
    <Card className="max-w-md p-5">
      <h2 className="text-[15px] font-semibold">
        {centerName ? `Zentrum „${centerName}“ beitreten` : "Zentrum beitreten"}
      </h2>
      <p className="mt-1 text-[13px] text-muted">
        {centerName
          ? "Bestätigen Sie den Beitritt, um Zugang zu erhalten."
          : "Geben Sie den Einladungs-Schlüssel Ihres Zentrums ein."}
      </p>
      {!code ? (
        <input
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Einladungs-Schlüssel"
          className="mt-3 w-full border border-border bg-background px-2.5 py-1.5 text-[13px] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        />
      ) : null}
      {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}
      <Button
        variant="primary"
        className="mt-3 w-full"
        disabled={busy || value.trim().length < 4}
        onClick={() => void join()}
      >
        {busy ? "Wird beigetreten…" : "Beitreten"}
      </Button>
    </Card>
  );
}
