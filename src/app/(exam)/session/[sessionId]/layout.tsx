import { ExamShell } from "@/components/exam";

/**
 * Coquille de session : nav sticky 2 niveaux + timer global + Zurück/Weiter
 * (composant client ExamShell). Le layout reste serveur : il ne fait que
 * résoudre le paramètre de route.
 */
export default async function SessionLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ sessionId: string }>;
}>) {
  const { sessionId } = await params;
  return <ExamShell sessionId={sessionId}>{children}</ExamShell>;
}
