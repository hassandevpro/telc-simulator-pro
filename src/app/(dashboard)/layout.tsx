import Link from "next/link";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCurrentUserPlan } from "@/lib/billing";
import { AccountMenu } from "@/components/account";

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
  const userId = session?.user?.id;

  // Un acheteur self-service devient CENTER_ADMIN, mais son JWT ne le
  // reflète qu'à la reconnexion : on affiche « Mein Zentrum » dès qu'il
  // possède un centre en base.
  const ownsCenter =
    role === "CENTER_ADMIN"
      ? true
      : userId
        ? !!(await db.center
            .findUnique({ where: { ownerId: userId }, select: { id: true } })
            .catch(() => null))
        : false;

  // Infos du compte pour le menu (avatar) : plan effectif + solde de crédits.
  const plan = await getCurrentUserPlan();
  let credits = 0;
  if (userId) {
    const me = await db.user
      .findUnique({
        where: { id: userId },
        select: {
          credits: true,
          centerId: true,
          center: { select: { owner: { select: { credits: true } } } },
        },
      })
      .catch(() => null);
    credits =
      me?.centerId && me.center?.owner ? me.center.owner.credits : (me?.credits ?? 0);
  }

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
            <AccountMenu
              name={session?.user?.name ?? ""}
              email={session?.user?.email ?? ""}
              plan={plan}
              credits={credits}
              isSuperAdmin={role === "SUPER_ADMIN"}
              ownsCenter={ownsCenter}
            />
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
