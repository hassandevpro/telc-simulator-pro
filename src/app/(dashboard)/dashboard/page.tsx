import { auth } from "@/lib/auth";
import { StartExamCard } from "@/components/exam/StartExamCard";
import { SessionList } from "@/components/results";
import { getCurrentUserPlan } from "@/lib/billing";
import { listAvailableExams, resolveDbExamId } from "@/lib/exam-content";
import { db } from "@/lib/db";

/**
 * Dashboard candidat : examen disponible + sessions de l'appareil.
 * Le plan est lu EN BASE (getCurrentUserPlan) — reflète un achat aussitôt et
 * rétrograde à FREE si l'abonnement a expiré, sans reconnexion.
 */
export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ payment?: string }>;
}) {
  const session = await auth();
  const plan = await getCurrentUserPlan();
  const ownerKey = session?.user?.id;
  const exams = await listAvailableExams(plan);
  const { payment } = await searchParams;

  // Crédits (anti-partage) + examens déjà terminés par ce candidat.
  // Un étudiant de centre consomme/voit le pool de son centre (propriétaire).
  let credits = 0;
  let isSuperAdmin = false;
  const doneExamIds = new Set<string>();
  if (ownerKey) {
    const me = await db.user.findUnique({
      where: { id: ownerKey },
      select: {
        credits: true,
        role: true,
        centerId: true,
        center: { select: { owner: { select: { credits: true } } } },
      },
    });
    isSuperAdmin = me?.role === "SUPER_ADMIN";
    credits =
      me?.centerId && me.center?.owner ? me.center.owner.credits : (me?.credits ?? 0);
    const doneSessions = await db.examSession.findMany({
      where: { userId: ownerKey, status: { in: ["SUBMITTED", "SCORED"] } },
      select: { examId: true },
    });
    doneSessions.forEach((s) => doneExamIds.add(s.examId));
  }
  // Les examId d'affichage (ex. « demo-b2 ») sont résolus vers l'id en base
  // pour être comparés aux sessions terminées.
  const examCards = await Promise.all(
    exams.map(async (exam) => ({
      exam,
      done: doneExamIds.has(await resolveDbExamId(exam.examId)),
    })),
  );

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

      {payment === "success" ? (
        <p className="mt-4 rounded-sm border border-border bg-surface px-3 py-2 text-[13px]">
          Zahlung erhalten — Ihr Zugang ist aktiv. Die Freischaltung kann einen
          Moment dauern; laden Sie die Seite bei Bedarf neu.
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          Verfügbare Prüfungen
        </h2>
        {!isSuperAdmin ? (
          <span className="text-[12px] text-muted">
            Guthaben:{" "}
            <span className={credits > 0 ? "font-medium" : "font-medium text-danger"}>
              {credits} Credit{credits === 1 ? "" : "s"}
            </span>
          </span>
        ) : null}
      </div>
      <div className="mt-2 space-y-2">
        {examCards.map(({ exam, done }) => (
          <StartExamCard
            key={exam.examId}
            examId={exam.examId}
            examTitle={exam.title}
            level={exam.level}
            ownerKey={ownerKey}
            done={done}
            blocked={!isSuperAdmin && !done && credits <= 0}
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
