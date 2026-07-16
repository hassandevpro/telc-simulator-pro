import { Card } from "@/components/ui";
import { db } from "@/lib/db";

/**
 * Statistiques d'administration. v1 : compteurs base — les statistiques
 * de sessions candidates arrivent avec la persistance v2.
 */
export default async function AdminHomePage() {
  let stats: {
    users: number;
    exams: number;
    published: number;
    questions: number;
  } | null = null;
  try {
    const [users, exams, published, questions] = await Promise.all([
      db.user.count(),
      db.exam.count(),
      db.exam.count({ where: { isPublished: true } }),
      db.question.count(),
    ]);
    stats = { users, exams, published, questions };
  } catch {
    stats = null;
  }

  const cards = stats
    ? [
        { label: "Benutzer", value: stats.users },
        { label: "Examen", value: stats.exams },
        { label: "Veröffentlicht", value: stats.published },
        { label: "Fragen", value: stats.questions },
      ]
    : [];

  return (
    <section>
      <h1 className="text-xl font-semibold">Statistiques</h1>
      {stats ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map((card) => (
            <Card key={card.label} className="p-4">
              <p className="text-[12px] uppercase tracking-wider text-muted">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {card.value}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-[13px] text-danger">
          Base de données non joignable — vérifier DATABASE_URL.
        </p>
      )}
      <p className="mt-4 text-[12px] text-muted">
        Les statistiques de sessions candidates arriveront avec la
        persistance serveur (v2) — les sessions v1 vivent en LocalStorage.
      </p>
    </section>
  );
}
