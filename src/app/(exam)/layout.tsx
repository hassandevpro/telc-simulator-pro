/**
 * MODE EXAMEN — layout isolé (ARCHITECTURE.md §2).
 * Aucun menu produit, aucun lien sortant, aucune distraction :
 * le candidat ne voit que le contenu d'examen. La coquille complète
 * (nav sticky + timer global) est montée par session/[sessionId]/layout.tsx
 * au Sprint 1.
 */
export default function ExamLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <div className="min-h-screen bg-background">{children}</div>;
}
