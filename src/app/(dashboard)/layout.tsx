import Link from "next/link";
import { auth } from "@/lib/auth";
import { SignOutButton } from "@/components/auth";

/**
 * Layout de l'espace candidat connecté (dashboard, résultats).
 * Les routes du groupe sont protégées par le middleware ; le layout
 * affiche la navigation et la déconnexion.
 */
export default async function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const role = session?.user?.role;

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-2.5">
          <Link
            href="/dashboard"
            className="text-[13px] font-semibold tracking-wide"
          >
            TELC SIMULATOR PRO
          </Link>
          <nav className="flex items-center gap-4 text-[13px] text-muted">
            <Link href="/dashboard" className="hover:text-foreground">
              Übersicht
            </Link>
            <Link href="/results" className="hover:text-foreground">
              Ergebnisse
            </Link>
            {role === "SUPER_ADMIN" ? (
              <Link href="/admin" className="hover:text-foreground">
                Administration
              </Link>
            ) : null}
            {role === "CENTER_ADMIN" ? (
              <Link href="/center" className="hover:text-foreground">
                Mein Zentrum
              </Link>
            ) : null}
            <SignOutButton />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
