import { auth } from "@/lib/auth";
import { StartExamCard } from "@/components/exam/StartExamCard";
import { SessionList } from "@/components/results";
import { listAvailableExams } from "@/lib/exam-content";

/**
 * Dashboard candidat : examen disponible + sessions de l'appareil.
 * v2 : liste des examens publiés depuis la base (isPublished).
 */
export default async function DashboardPage() {
  const session = await auth();
  const plan = session?.user?.plan;
  const ownerKey = session?.user?.id;
  const exams = await listAvailableExams(plan);

  return (
    <section>
      <h1 className="text-xl font-semibold">
        Übersicht
        {session?.user?.name ? (
          <span className="ml-2 text-base font-normal text-muted">
            — {session.user.name}
          </span>
        ) : null}
      </h1>

      <h2 className="mt-6 text-[13px] font-semibold uppercase tracking-wide text-muted">
        Verfügbare Prüfungen
      </h2>
      <div className="mt-2 space-y-2">
        {exams.map((exam) => (
          <StartExamCard
            key={exam.examId}
            examId={exam.examId}
            examTitle={exam.title}
            level={exam.level}
            ownerKey={ownerKey}
          />
        ))}
      </div>

      {plan === "FREE" ? (
        <p className="mt-3 text-[12px] text-muted">
          Ihr Plan (Free) umfasst den Demo-Modelltest. Alle veröffentlichten
          Modelltests erhalten Sie ab dem Plan Student —{" "}
          <a
            href="/pricing"
            className="text-accent underline underline-offset-2"
          >
            Preise ansehen
          </a>
          .
        </p>
      ) : null}

      <h2 className="mt-8 text-[13px] font-semibold uppercase tracking-wide text-muted">
        Ihre Sitzungen
      </h2>
      <div className="mt-2">
        <SessionList ownerKey={ownerKey} />
      </div>
    </section>
  );
}
