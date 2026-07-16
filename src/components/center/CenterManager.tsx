"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card } from "@/components/ui";

interface Member {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
interface CenterData {
  id: string;
  name: string;
  inviteCode: string;
  seats: number;
  memberCount: number;
}

/**
 * Espace du CENTER_ADMIN : crée son centre, partage le lien + la clé
 * d'invitation, achète des sièges (quota d'étudiants) et gère ses membres.
 */
export function CenterManager({ paymentSuccess }: { paymentSuccess: boolean }) {
  const [center, setCenter] = useState<CenterData | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [seats, setSeats] = useState(10);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/center");
    if (!response.ok) {
      setError("Nicht abrufbar.");
      setLoaded(true);
      return;
    }
    const data = (await response.json()) as {
      center: CenterData | null;
      members: Member[];
    };
    setCenter(data.center);
    setMembers(data.members);
    setLoaded(true);
  }, []);

  useEffect(() => {
    Promise.resolve().then(load).catch(() => undefined);
  }, [load]);

  const createCenter = async () => {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/center", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Erstellen fehlgeschlagen.");
    } else {
      await load();
    }
    setBusy(false);
  };

  const regenerate = async () => {
    setBusy(true);
    await fetch("/api/center/regenerate", { method: "POST" });
    await load();
    setBusy(false);
  };

  const removeMember = async (userId: string) => {
    setBusy(true);
    await fetch(`/api/center/members/${userId}`, { method: "DELETE" });
    await load();
    setBusy(false);
  };

  const buySeats = async (provider: "stripe" | "flutterwave") => {
    setBusy(true);
    setError(null);
    const response = await fetch("/api/center/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider, seats }),
    });
    const data = (await response.json().catch(() => null)) as {
      url?: string;
      error?: string;
    } | null;
    if (!response.ok || !data?.url) {
      setError(data?.error ?? "Zahlung nicht möglich.");
      setBusy(false);
      return;
    }
    window.location.href = data.url;
  };

  if (!loaded) {
    return <p className="text-[13px] text-muted">Wird geladen…</p>;
  }

  // ── Aucun centre : formulaire de création ────────────────────────────────
  if (!center) {
    return (
      <Card className="max-w-md p-5">
        <h2 className="text-[15px] font-semibold">Zentrum einrichten</h2>
        <p className="mt-1 text-[13px] text-muted">
          Geben Sie Ihrem Zentrum einen Namen. Danach erhalten Sie einen
          Einladungslink für Ihre Studierenden.
        </p>
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name des Zentrums"
          className="mt-3 w-full border border-border bg-background px-2.5 py-1.5 text-[13px] rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent"
        />
        {error ? <p className="mt-2 text-[12px] text-danger">{error}</p> : null}
        <Button
          variant="primary"
          className="mt-3 w-full"
          disabled={busy || name.trim().length < 2}
          onClick={() => void createCenter()}
        >
          Zentrum erstellen
        </Button>
      </Card>
    );
  }

  const joinUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/join/${center.inviteCode}`
      : `/join/${center.inviteCode}`;
  const seatsFree = Math.max(0, center.seats - center.memberCount);

  return (
    <div className="space-y-4">
      {paymentSuccess ? (
        <p className="rounded-sm border border-border bg-surface px-3 py-2 text-[13px]">
          Zahlung erhalten — die Plätze werden Ihrem Zentrum gutgeschrieben.
        </p>
      ) : null}

      <Card className="p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-[15px] font-semibold">{center.name}</h2>
          <span className="text-[13px] text-muted tabular-nums">
            {center.memberCount} / {center.seats} Plätze belegt
            {" · "}
            {seatsFree} frei
          </span>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-[13px] font-medium">Einladung</p>
          <p className="mt-1 text-[12px] text-muted">
            Teilen Sie diesen Link (er enthält die Zugangs-Schlüssel) mit Ihren
            Studierenden. Sie treten nach der Anmeldung mit einem Klick bei.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="flex-1 min-w-0 truncate border border-border bg-surface px-2 py-1.5 text-[12px] rounded-sm">
              {joinUrl}
            </code>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => {
                void navigator.clipboard.writeText(joinUrl);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Kopiert" : "Kopieren"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={() => void regenerate()}>
              Schlüssel erneuern
            </Button>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            Schlüssel: <span className="font-mono">{center.inviteCode}</span>
          </p>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <p className="text-[13px] font-medium">Plätze kaufen (pro Studierende/n)</p>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="seats" className="text-[12px] text-muted">
                Anzahl Plätze
              </label>
              <input
                id="seats"
                type="number"
                min={1}
                max={500}
                value={seats}
                onChange={(event) =>
                  setSeats(Math.max(1, Number(event.target.value) || 1))
                }
                className="mt-1 w-24 border border-border bg-background px-2 py-1.5 text-[13px] rounded-sm"
              />
            </div>
            <Button variant="primary" disabled={busy} onClick={() => void buySeats("stripe")}>
              Mit Karte
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => void buySeats("flutterwave")}
            >
              Mobile Money / Afrika
            </Button>
          </div>
          <p className="mt-1 text-[12px] text-muted">
            Der Kauf setzt das Kontingent auf die gewählte Anzahl (30 Tage).
          </p>
        </div>

        {error ? <p className="mt-3 text-[12px] text-danger">{error}</p> : null}
      </Card>

      <Card className="divide-y divide-border">
        <p className="px-4 py-2 text-[12px] font-semibold uppercase tracking-wider text-muted">
          Studierende
        </p>
        {members.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">
            Noch keine Studierenden beigetreten.
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member.id}
              className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]"
            >
              <div>
                <p className="font-medium">{member.name}</p>
                <p className="text-[12px] text-muted">{member.email}</p>
              </div>
              <Button
                variant="danger"
                disabled={busy}
                onClick={() => void removeMember(member.id)}
              >
                Entfernen
              </Button>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
