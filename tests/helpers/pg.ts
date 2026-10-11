/**
 * Tests d'INTÉGRATION — base PostgreSQL réelle.
 *
 * Les tests à doubles de base (tests/*.test.ts sans préfixe `int-`) prouvent
 * la logique de décision ; ceux-ci prouvent ce que seul PostgreSQL garantit :
 * atomicité des UPDATE conditionnels, verrous de ligne, rollback des
 * transactions, sous requêtes RÉELLEMENT concurrentes.
 *
 * Activation : TEST_DATABASE_URL doit pointer vers une base JETABLE sur
 * laquelle `prisma migrate deploy` a été appliqué. Chaque test VIDE les
 * tables : n'utilisez jamais l'URL de production ni de staging.
 *
 *   createdb telc_test
 *   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
 *   TEST_DATABASE_URL=postgresql://…/telc_test npm test
 *
 * Sans TEST_DATABASE_URL, ces tests sont marqués SKIP (visible dans le
 * rapport), jamais comptés comme réussis.
 */
export const TEST_DATABASE_URL = process.env.TEST_DATABASE_URL ?? "";

export const integrationSkip: string | false = TEST_DATABASE_URL
  ? false
  : "TEST_DATABASE_URL absente — tests d'intégration PostgreSQL non exécutés";

/** À appeler AVANT tout import de @/lib/db (le client lit l'URL au chargement). */
export function selectTestDatabase(): void {
  if (!TEST_DATABASE_URL) return;
  if (/supabase\.co|pooler\.supabase|amazonaws\.com/i.test(TEST_DATABASE_URL)) {
    throw new Error("TEST_DATABASE_URL ressemble à une base hébergée : refus.");
  }
  process.env.DATABASE_URL = TEST_DATABASE_URL;
}

type Db = typeof import("@/lib/db").db;

/** Vide toutes les tables applicatives (base de test uniquement). */
export async function resetDatabase(db: Db): Promise<void> {
  await db.$executeRawUnsafe(
    'TRUNCATE "Answer", "Result", "ExamSession", "Question", "ExamPart", "Exam", ' +
      '"Payment", "CenterSeatGrant", "Center", "VerificationToken", "LessonProgress", "User" CASCADE',
  );
}

export const DAY = 86_400_000;

export interface SeedUser {
  id: string;
  credits?: number;
  plan?: "FREE" | "STUDENT" | "PREMIUM" | "CENTER";
  planExpiresAt?: Date | null;
  role?: "STUDENT" | "CENTER_ADMIN" | "SUPER_ADMIN";
  centerId?: string | null;
  centerJoinedAt?: Date | null;
}

export async function createUser(db: Db, user: SeedUser) {
  return db.user.create({
    data: {
      id: user.id,
      email: `${user.id}@test.local`,
      name: user.id,
      credits: user.credits ?? 0,
      plan: user.plan ?? "STUDENT",
      planExpiresAt:
        user.planExpiresAt === undefined
          ? new Date(Date.now() + 10 * DAY)
          : user.planExpiresAt,
      role: user.role ?? "STUDENT",
      centerId: user.centerId ?? null,
      centerJoinedAt: user.centerJoinedAt ?? null,
    },
  });
}

/**
 * Examen PAYANT B2 minimal : Lesen Teil 1, deux items de 5 points dont les
 * clés sont des sentinelles (jamais renvoyées au client).
 */
export async function createPaidExam(db: Db, id = "exam-paid") {
  await db.exam.create({
    data: {
      id,
      title: `Modelltest ${id}`,
      level: "B2",
      isPublished: true,
      parts: {
        create: {
          sectionId: "lesen",
          partId: "teil-1",
          questions: {
            create: [
              { id: `${id}-q1`, position: 1, type: "TITLE_MATCHING", content: {}, answerKey: "KEY_SECRET_ALPHA", points: 5 },
              { id: `${id}-q2`, position: 2, type: "TITLE_MATCHING", content: {}, answerKey: "KEY_SECRET_BETA", points: 5 },
            ],
          },
        },
      },
    },
  });
  return { examId: id, q1: `${id}-q1`, q2: `${id}-q2` };
}

export function jsonRequest(url: string, method: string, body?: unknown): Request {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}
