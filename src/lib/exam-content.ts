import { cookies } from "next/headers";
import { getStructureForLevel } from "@/config/exam-structure";
import { db } from "@/lib/db";
import type { ScoringQuestion } from "@/lib/scoring/score-session";
import type { Level, SectionId } from "@/types/exam";
import type {
  ExamContentBundle,
  PartContent,
} from "@/types/question-content";
import { DEMO_B2_ANSWER_KEYS, DEMO_B2_CONTENT } from "./demo-b2-content";

/**
 * Fournisseur de contenu d'examen — même principe que le SessionRepository :
 * les pages ne connaissent que cette interface.
 *
 * Depuis le Sprint 10 : PRISMA D'ABORD (contenus créés via l'admin),
 * fixture de démonstration en repli ("demo-b2", ou base indisponible).
 * Le bundle servi aux pages n'inclut JAMAIS answerKey ; seules les
 * fonctions de scoring (serveur) y accèdent.
 */

/* ------------------------- Lecture depuis la base ------------------------- */

interface DbPartRow {
  sectionId: string;
  partId: string;
  sharedContent: unknown;
  audioUrl: string | null;
  questions: {
    id: string;
    position: number;
    content: unknown;
    answerKey: unknown;
    points: number;
  }[];
}

function buildBundleFromDb(
  examId: string,
  title: string,
  level: Level,
  rows: DbPartRow[],
): ExamContentBundle {
  const structure = getStructureForLevel(level);
  const parts: Record<string, PartContent> = {};

  for (const row of rows) {
    const structPart = structure.schriftlichePruefung.sections
      .find((section) => section.id === row.sectionId)
      ?.parts.find((part) => part.id === row.partId);
    if (!structPart) continue;

    const shared = {
      ...((row.sharedContent as object | null) ?? {}),
      ...(row.audioUrl ? { audioUrl: row.audioUrl } : {}),
    };

    parts[`${row.sectionId}/${row.partId}`] = {
      type: structPart.questionType,
      shared,
      questions: row.questions.map((question) => ({
        id: question.id,
        position: question.position,
        points: question.points,
        content: question.content,
        // answerKey volontairement absent du bundle.
      })),
    } as PartContent;
  }

  return { examId, title, level, parts };
}

async function getExamContentFromDb(
  examId: string,
): Promise<ExamContentBundle | null> {
  try {
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: {
        parts: {
          include: { questions: { orderBy: { position: "asc" } } },
        },
      },
    });
    if (!exam) return null;
    return buildBundleFromDb(
      exam.id,
      exam.title,
      exam.level as Level,
      exam.parts as unknown as DbPartRow[],
    );
  } catch {
    // Base indisponible (mode LocalStorage-first sans DATABASE_URL) :
    // le repli fixture prend le relais.
    return null;
  }
}

/* ------------------------------ API publique ------------------------------ */

/**
 * Titre de l'import en base du Modelltest de démonstration — posé par
 * /api/admin/exams/import-demo. Sert à retrouver la copie ÉDITABLE de la
 * démo (audios, éditions admin) et à la faire servir à la place de la
 * fixture codée en dur.
 */
export const DEMO_IMPORT_TITLE = `${DEMO_B2_CONTENT.title} — Import`;

async function findDemoImportExamId(): Promise<string | null> {
  try {
    const exam = await db.exam.findFirst({
      where: { title: DEMO_IMPORT_TITLE },
      select: { id: true },
    });
    return exam?.id ?? null;
  } catch {
    return null;
  }
}

/**
 * Alias la démo par défaut (`demo-b2`, fixture) vers son import éditable
 * en base s'il existe — ainsi les éditions admin (audio Hören inclus) sont
 * servies au candidat, y compris aux comptes Free, sans dépendre de quel
 * examId a été figé dans le cookie de session. Tout autre examId est
 * renvoyé tel quel.
 */
async function resolveDbExamId(examId: string): Promise<string> {
  if (examId === DEMO_B2_CONTENT.examId) {
    const importId = await findDemoImportExamId();
    if (importId) return importId;
  }
  return examId;
}

export async function getExamContent(
  examId: string,
): Promise<ExamContentBundle | null> {
  const fromDb = await getExamContentFromDb(await resolveDbExamId(examId));
  if (fromDb) return fromDb;
  if (examId === DEMO_B2_CONTENT.examId) return DEMO_B2_CONTENT;
  return null;
}

export async function getPartContent(
  examId: string,
  sectionId: SectionId,
  partId: string,
): Promise<PartContent | null> {
  const bundle = await getExamContent(examId);
  return bundle?.parts[`${sectionId}/${partId}`] ?? null;
}

/**
 * Examens proposables au candidat selon son plan : la démonstration pour
 * tous, le catalogue publié à partir du plan Student (config/plans.ts).
 */
export async function listAvailableExams(
  plan?: string,
): Promise<{ examId: string; title: string; level: Level }[]> {
  const exams: { examId: string; title: string; level: Level }[] = [];
  const { planIncludesFullCatalog } = await import("@/config/plans");
  const fullCatalog = planIncludesFullCatalog(plan);
  let demoImportListed = false;
  try {
    const published = await db.exam.findMany({
      where: { isPublished: true },
      orderBy: { createdAt: "desc" },
      select: { id: true, title: true, level: true },
    });
    for (const exam of published) {
      const isDemoImport = exam.title === DEMO_IMPORT_TITLE;
      // La démo (import éditable) reste offerte à TOUS, y compris Free ;
      // le reste du catalogue est réservé aux plans payants.
      if (!fullCatalog && !isDemoImport) continue;
      exams.push({
        examId: exam.id,
        // Affiche le titre « propre » de la démo (sans le suffixe technique).
        title: isDemoImport ? DEMO_B2_CONTENT.title : exam.title,
        level: exam.level as Level,
      });
      if (isDemoImport) demoImportListed = true;
    }
  } catch {
    // Base indisponible : seule la fixture de démonstration est proposée.
  }
  // Repli fixture uniquement si l'import éditable n'est pas déjà proposé,
  // pour éviter deux entrées « démo » qui pointent vers le même contenu.
  if (!demoImportListed) {
    exams.push({
      examId: DEMO_B2_CONTENT.examId,
      title: DEMO_B2_CONTENT.title,
      level: DEMO_B2_CONTENT.level,
    });
  }
  return exams;
}

/**
 * ExamId d'une session, côté serveur (v1) : posé dans un cookie à la
 * création de la session (StartExamCard) — les sessions vivent en
 * LocalStorage, invisible du serveur. v2 : lecture d'ExamSession en base.
 */
export async function resolveSessionExamId(sessionId: string): Promise<string> {
  const jar = await cookies();
  return jar.get(`telc-exam-${sessionId}`)?.value ?? DEMO_B2_CONTENT.examId;
}

/* ------------------------------- Correction ------------------------------- */

/**
 * Données de correction — CÔTÉ SERVEUR UNIQUEMENT (API de correction).
 * Base d'abord (answerKey des questions), fixture en repli.
 */
export async function getExamScoringData(
  examId: string,
): Promise<ScoringQuestion[]> {
  // Même alias que le contenu : si la session tourne sur la démo par
  // défaut mais qu'un import éditable existe, on corrige sur SES questions
  // (mêmes identifiants que le contenu servi) — sinon les réponses,
  // indexées par id de question, ne correspondraient à rien.
  examId = await resolveDbExamId(examId);
  try {
    const exam = await db.exam.findUnique({
      where: { id: examId },
      include: { parts: { include: { questions: true } } },
    });
    if (exam) {
      const questions: ScoringQuestion[] = [];
      for (const part of exam.parts) {
        for (const question of part.questions) {
          questions.push({
            questionId: question.id,
            sectionId: part.sectionId as SectionId,
            partId: part.partId,
            points: question.points,
            key:
              typeof question.answerKey === "string"
                ? question.answerKey
                : null,
          });
        }
      }
      if (questions.length > 0) return questions;
    }
  } catch {
    // repli fixture
  }

  if (examId !== DEMO_B2_CONTENT.examId) return [];
  const questions: ScoringQuestion[] = [];
  for (const [key, part] of Object.entries(DEMO_B2_CONTENT.parts)) {
    const [sectionId, partId] = key.split("/") as [SectionId, string];
    for (const question of part.questions) {
      questions.push({
        questionId: question.id,
        sectionId,
        partId,
        points: question.points,
        key:
          part.type === "WRITING"
            ? null
            : (DEMO_B2_ANSWER_KEYS[question.id] ?? null),
      });
    }
  }
  return questions;
}
