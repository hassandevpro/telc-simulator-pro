import { ResultView } from "@/components/results";

/** Détail d'un résultat : synthèse, prognose, détail par section. */
export default async function ResultDetailPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  return (
    <section>
      <h1 className="text-xl font-semibold">Ergebnis</h1>
      <div className="mt-4">
        <ResultView sessionId={sessionId} />
      </div>
    </section>
  );
}
