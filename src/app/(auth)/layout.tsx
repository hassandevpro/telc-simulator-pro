/**
 * Layout épuré des pages d'authentification : aucune navigation,
 * formulaire centré (UI au Sprint 9).
 */
export default function AuthLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-surface p-4">
      {children}
    </div>
  );
}
