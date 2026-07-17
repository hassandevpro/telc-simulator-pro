"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { signOut } from "next-auth/react";

export interface AccountMenuProps {
  name: string;
  email: string;
  plan: string;
  credits: number;
  isSuperAdmin: boolean;
  ownsCenter: boolean;
}

const PLAN_LABEL: Record<string, string> = {
  FREE: "Free",
  STUDENT: "Student",
  PREMIUM: "Premium",
  CENTER: "Center",
};

/** Initiales à partir du nom (ou de l'e-mail en repli). */
function initials(name: string, email: string): string {
  const src = name.trim() || email;
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

/**
 * Menu compte (façon ChatGPT) : avatar en haut à droite qui ouvre un panneau
 * avec les infos du compte, le plan et le solde de crédits, un accès rapide
 * au changement de plan, aux espaces admin/centre, et à la déconnexion.
 */
export function AccountMenu({
  name,
  email,
  plan,
  credits,
  isSuperAdmin,
  ownsCenter,
}: AccountMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermeture au clic à l'extérieur et à la touche Échap.
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Konto"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-[12px] font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {initials(name, email)}
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 rounded-md border border-border bg-surface py-2 text-[13px] shadow-lg"
        >
          <div className="px-3 py-2">
            <p className="truncate font-medium">{name || "Konto"}</p>
            <p className="truncate text-[12px] text-muted">{email}</p>
          </div>

          <div className="border-t border-border px-3 py-2">
            <div className="flex items-center justify-between">
              <span className="text-muted">Plan</span>
              <span className="font-medium">{PLAN_LABEL[plan] ?? plan}</span>
            </div>
            <div className="mt-1 flex items-center justify-between">
              <span className="text-muted">Guthaben</span>
              <span className="font-medium">
                {isSuperAdmin ? "∞" : `${credits} Credit${credits === 1 ? "" : "s"}`}
              </span>
            </div>
          </div>

          <div className="border-t border-border py-1">
            <MenuLink href="/dashboard" onClick={() => setOpen(false)}>
              Übersicht
            </MenuLink>
            <MenuLink href="/results" onClick={() => setOpen(false)}>
              Ergebnisse
            </MenuLink>
            <MenuLink href="/pricing" onClick={() => setOpen(false)}>
              Plan ändern
            </MenuLink>
            {isSuperAdmin ? (
              <MenuLink href="/admin" onClick={() => setOpen(false)}>
                Administration
              </MenuLink>
            ) : null}
            {ownsCenter ? (
              <MenuLink href="/center" onClick={() => setOpen(false)}>
                Mein Zentrum
              </MenuLink>
            ) : null}
          </div>

          <div className="border-t border-border py-1">
            <button
              type="button"
              role="menuitem"
              onClick={() => void signOut({ callbackUrl: "/" })}
              className="block w-full px-3 py-1.5 text-left text-danger hover:bg-background"
            >
              Abmelden
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      role="menuitem"
      onClick={onClick}
      className="block px-3 py-1.5 hover:bg-background"
    >
      {children}
    </Link>
  );
}
