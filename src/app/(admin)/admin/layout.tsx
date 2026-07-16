import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/**
 * Layout admin avec garde de rôle (ARCHITECTURE.md §2).
 * Le middleware protège déjà /admin (connexion requise) ; cette garde
 * vérifie en plus le rôle. Les rôles seront réellement attribués au
 * Sprint 9 (auth) — la garde est active dès maintenant.
 */
export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const session = await auth();
  const role = session?.user?.role;

  if (role !== "SUPER_ADMIN" && role !== "CENTER_ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link
            href="/admin"
            className="text-[13px] font-semibold tracking-wide"
          >
            TELC SIMULATOR PRO — ADMINISTRATION
          </Link>
          <nav className="flex items-center gap-4 text-[13px] text-muted">
            <Link href="/admin/exams" className="hover:text-foreground">
              Examens
            </Link>
            <Link href="/admin/questions" className="hover:text-foreground">
              Questions
            </Link>
            <Link href="/admin/audio" className="hover:text-foreground">
              Audio
            </Link>
            <Link href="/admin/users" className="hover:text-foreground">
              Utilisateurs
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
