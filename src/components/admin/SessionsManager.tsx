"use client";

import { useState } from "react";
import { Button, Card } from "@/components/ui";

interface SessionRow {
  id: string;
  exam: string;
  status: string;
  startedAt: number | null;
  creditStatus: string | null;
  refund: { reason: string; at: number } | null;
}
interface Result {
  user: { id: string; email: string; name: string; credits: number } | null;
  sessions: SessionRow[];
}

const REFUNDABLE = ["CHARGED", "CHARGED_AT_SUBMIT"];

/**
 * Support : recherche des sessions d'un candidat par e-mail et remboursement
 * manuel d'UN crédit (une seule fois par session, avec une justification).
 */
export function SessionsManager() {
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});

  const search = async (target = email) => {
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/sessions?email=${encodeURIComponent(target)}`);
    if (!response.ok) {
      setError("Suche fehlgeschlagen.");
    } else {
      setResult((await response.json()) as Result);
    }
    setBusy(false);
  };

  const refund = async (sessionId: string) => {
    const reason = reasons[sessionId]?.trim() ?? "";
    if (reason.length < 3) {
      setError("Bitte eine Begründung angeben (mind. 3 Zeichen).");
      return;
    }
    if (!window.confirm("1 Credit für diese Sitzung erstatten? Dies kann nicht rückgängig gemacht werden.")) {
      return;
    }
    setBusy(true);
    setError(null);
    const response = await fetch(`/api/admin/sessions/${encodeURIComponent(sessionId)}/refund`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as { error?: string } | null;
      setError(data?.error ?? "Erstattung fehlgeschlagen.");
      setBusy(false);
      return;
    }
    await search(result?.user?.email ?? email);
  };

  return (
    <div className="space-y-3">
      <Card muted className="flex flex-wrap items-end gap-2 p-3">
        <label className="text-[12px] text-muted">
          E-Mail des Kandidaten
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 block w-72 border border-border bg-background px-2 py-1.5 text-[13px] text-foreground rounded-sm"
          />
        </label>
        <Button variant="primary" disabled={busy || !email} onClick={() => void search()}>
          Suchen
        </Button>
      </Card>
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}

      {result && !result.user ? (
        <p className="text-[13px] text-muted">Kein Konto mit dieser E-Mail-Adresse.</p>
      ) : null}
      {result?.user ? (
        <Card className="divide-y divide-border">
          <p className="px-4 py-2 text-[13px]">
            <strong>{result.user.name}</strong> · {result.user.email} · Guthaben:{" "}
            <span className="tabular-nums">{result.user.credits}</span> Credits
          </p>
          {result.sessions.length === 0 ? (
            <p className="p-4 text-[13px] text-muted">Keine Sitzungen.</p>
          ) : (
            result.sessions.map((session) => (
              <div key={session.id} className="space-y-2 px-4 py-3 text-[13px]">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <span className="font-medium">{session.exam}</span>
                  <span className="font-mono text-[12px] text-muted">
                    {session.id} · {session.status} · Credit: {session.creditStatus ?? "—"}
                    {session.startedAt
                      ? ` · gestartet ${new Date(session.startedAt).toLocaleString("de-DE")}`
                      : ""}
                  </span>
                </div>
                {session.refund ? (
                  <p className="text-[12px] text-muted">
                    Erstattet am {new Date(session.refund.at).toLocaleDateString("de-DE")} —{" "}
                    {session.refund.reason}
                  </p>
                ) : session.creditStatus && REFUNDABLE.includes(session.creditStatus) ? (
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      value={reasons[session.id] ?? ""}
                      onChange={(event) =>
                        setReasons((current) => ({ ...current, [session.id]: event.target.value }))
                      }
                      placeholder="Begründung (Pflicht)"
                      className="w-72 border border-border bg-background px-2 py-1 text-[12px] rounded-sm"
                    />
                    <Button variant="secondary" disabled={busy} onClick={() => void refund(session.id)}>
                      1 Credit erstatten
                    </Button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </Card>
      ) : null}
    </div>
  );
}
