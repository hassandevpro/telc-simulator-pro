import { SessionList } from "@/components/results";

/** Historique des sessions et résultats. */
export default function ResultsPage() {
  return (
    <section>
      <h1 className="text-xl font-semibold">Ergebnisse</h1>
      <p className="mt-1 text-[13px] text-muted">
        Ihre Prüfungssitzungen auf diesem Gerät.
      </p>
      <div className="mt-4">
        <SessionList />
      </div>
    </section>
  );
}
