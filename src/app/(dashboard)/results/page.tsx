import { auth } from "@/lib/auth";
import { SessionList } from "@/components/results";

/** Historique des sessions et résultats — cloisonné à l'utilisateur courant. */
export default async function ResultsPage() {
  const session = await auth();
  return (
    <section>
      <h1 className="text-xl font-semibold">Ergebnisse</h1>
      <p className="mt-1 text-[13px] text-muted">
        Ihre Prüfungssitzungen auf diesem Gerät.
      </p>
      <div className="mt-4">
        <SessionList ownerKey={session?.user?.id} />
      </div>
    </section>
  );
}
