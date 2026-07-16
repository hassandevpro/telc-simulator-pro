import { AudioCheck } from "@/components/exam/AudioCheck";

/**
 * Test casque obligatoire. La session concernée est passée en paramètre
 * de requête (?session=…) — la route reste hors de session/[sessionId],
 * conformément à l'architecture : on n'est pas encore DANS l'épreuve.
 */
export default async function AudioCheckPage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string }>;
}) {
  const { session } = await searchParams;

  if (!session) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <h1 className="text-base font-semibold">Audiotest</h1>
        <p className="mt-2 text-[13px] text-muted">
          Keine Prüfungssitzung angegeben. Bitte starten Sie die Prüfung
          über Ihre Übersicht.
        </p>
      </div>
    );
  }

  return <AudioCheck sessionId={session} />;
}
