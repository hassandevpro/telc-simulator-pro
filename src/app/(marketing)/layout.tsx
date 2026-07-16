import Link from "next/link";

/**
 * Layout des pages publiques (landing, pricing).
 * Sobriété volontaire — même langage visuel que le simulateur.
 */
export default function MarketingLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/" className="text-[13px] font-semibold tracking-wide">
            TELC SIMULATOR PRO
          </Link>
          <nav className="flex items-center gap-4 text-[13px] text-muted">
            <Link href="/pricing" className="hover:text-foreground">
              Preise
            </Link>
            <Link href="/login" className="hover:text-foreground">
              Anmelden
            </Link>
            <Link
              href="/register"
              className="border border-border px-2.5 py-1 rounded-sm hover:bg-surface"
            >
              Registrieren
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-[12px] text-muted">
          <span>TELC Simulator Pro — Prüfungssimulation für telc Deutsch B1/B2.</span>
          <span>
            Kein offizielles Produkt der telc gGmbH. „telc“ ist eine Marke
            der telc gGmbH.
          </span>
        </div>
      </footer>
    </div>
  );
}
