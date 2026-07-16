"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Select } from "@/components/ui";

interface UserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  plan: string;
  createdAt: string;
}

const ROLES = ["STUDENT", "CENTER_ADMIN", "SUPER_ADMIN"];
const PLANS = ["FREE", "STUDENT", "CENTER", "PREMIUM"];

/** Gestion des comptes : rôle, plan, suppression. */
export function UsersManager() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const response = await fetch("/api/admin/users");
    if (!response.ok) {
      setError("Liste nicht abrufbar (Datenbank erreichbar?).");
      return;
    }
    setUsers((await response.json()) as UserRow[]);
    setError(null);
  }, []);

  useEffect(() => {
    // Chargement initial : load est invoqué en callback de promesse —
    // aucun setState synchrone dans le corps de l'effet.
    Promise.resolve().then(load).catch(() => undefined);
  }, [load]);

  const call = async (input: string, init?: RequestInit) => {
    setBusy(true);
    setError(null);
    const response = await fetch(input, init);
    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "Aktion fehlgeschlagen.");
    }
    await load();
    setBusy(false);
  };

  const patch = (userId: string, data: Record<string, string>) =>
    call(`/api/admin/users/${userId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

  return (
    <div className="space-y-3">
      {error ? <p className="text-[13px] text-danger">{error}</p> : null}
      <Card className="divide-y divide-border">
        {users.length === 0 ? (
          <p className="p-4 text-[13px] text-muted">Keine Benutzer.</p>
        ) : (
          users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 px-4 py-2.5 text-[13px]"
            >
              <div className="min-w-56">
                <p className="font-medium">{user.name}</p>
                <p className="text-[12px] text-muted">{user.email}</p>
              </div>
              <div className="flex items-center gap-2">
                <Select
                  aria-label={`Rolle für ${user.email}`}
                  options={ROLES.map((role) => ({ value: role, label: role }))}
                  value={user.role}
                  placeholder={user.role}
                  disabled={busy}
                  onChange={(event) =>
                    void patch(user.id, { role: event.target.value })
                  }
                />
                <Select
                  aria-label={`Plan für ${user.email}`}
                  options={PLANS.map((plan) => ({ value: plan, label: plan }))}
                  value={user.plan}
                  placeholder={user.plan}
                  disabled={busy}
                  onChange={(event) =>
                    void patch(user.id, { plan: event.target.value })
                  }
                />
                <Button
                  variant="danger"
                  disabled={busy}
                  onClick={() => {
                    if (window.confirm(`Konto ${user.email} löschen?`)) {
                      void call(`/api/admin/users/${user.id}`, {
                        method: "DELETE",
                      });
                    }
                  }}
                >
                  Löschen
                </Button>
              </div>
            </div>
          ))
        )}
      </Card>
    </div>
  );
}
