import { countWords } from "@/lib/text";
import type { ExamStructure, SectionId } from "@/types/exam";
import type {
  PartScore,
  SectionScore,
  SessionScore,
  WritingInfo,
} from "@/types/scoring";
import type { AnswerMap } from "@/types/session";
import { SCORING } from "@/config/scoring";

/**
 * Question sous sa forme de correction — produite CÔTÉ SERVEUR par
 * lib/exam-content.getExamScoringData. `key` est null pour le Schreiben
 * (correction manuelle, conforme au réel).
 */
export interface ScoringQuestion {
  questionId: string;
  sectionId: SectionId;
  partId: string;
  points: number;
  key: string | null;
}

/**
 * Moteur de correction (ARCHITECTURE.md §7) — fonction PURE :
 * réponses + clés + structure → score. Aucune E/S, entièrement testable.
 * Corrige tout sauf le Schreiben : comparaison stricte réponse/clé,
 * agrégation par Teil puis par section. Le Schreiben est décrit
 * (Aufgabe retenue, nombre de mots) mais pas noté.
 */
export function scoreSession(
  answers: AnswerMap,
  questions: ScoringQuestion[],
  structure: ExamStructure,
): SessionScore {
  const partScores = new Map<string, PartScore>();

  for (const section of structure.schriftlichePruefung.sections) {
    for (const part of section.parts) {
      if (part.questionType === "WRITING") continue;
      partScores.set(`${section.id}/${part.id}`, {
        sectionId: section.id,
        partId: part.id,
        points: 0,
        maxPoints: 0,
        answeredCount: 0,
        itemCount: 0,
      });
    }
  }

  const writingCandidates: { partId: string; text: string }[] = [];
  let writingMaxPoints = 0;

  for (const question of questions) {
    const value = answers[question.questionId] ?? null;

    if (question.key === null) {
      // Schreiben — décrit, pas noté.
      writingMaxPoints = Math.max(writingMaxPoints, question.points);
      if (typeof value === "string" && value.trim() !== "") {
        writingCandidates.push({ partId: question.partId, text: value });
      }
      continue;
    }

    const partScore = partScores.get(
      `${question.sectionId}/${question.partId}`,
    );
    if (!partScore) continue;

    partScore.itemCount += 1;
    partScore.maxPoints += question.points;
    if (value !== null) {
      partScore.answeredCount += 1;
      if (value === question.key) {
        partScore.points += question.points;
      }
    }
  }

  const parts = [...partScores.values()];

  const sectionMap = new Map<SectionId, SectionScore>();
  for (const part of parts) {
    const section = sectionMap.get(part.sectionId) ?? {
      sectionId: part.sectionId,
      points: 0,
      maxPoints: 0,
      answeredCount: 0,
      itemCount: 0,
    };
    section.points += part.points;
    section.maxPoints += part.maxPoints;
    section.answeredCount += part.answeredCount;
    section.itemCount += part.itemCount;
    sectionMap.set(part.sectionId, section);
  }
  const sections = [...sectionMap.values()];

  // Aufgabe retenue : la production non vide — la plus longue si les deux
  // ont été traitées (consigne : une seule est évaluée).
  const chosen = writingCandidates.sort(
    (a, b) => countWords(b.text) - countWords(a.text),
  )[0];
  const writing: WritingInfo = {
    chosenPartId: chosen?.partId ?? null,
    wordCount: chosen ? countWords(chosen.text) : 0,
    maxPoints: writingMaxPoints,
  };

  const objectivePoints = parts.reduce((sum, p) => sum + p.points, 0);
  const objectiveMaxPoints = parts.reduce((sum, p) => sum + p.maxPoints, 0);
  const scoring = SCORING[structure.level];

  return {
    scoredAt: Date.now(),
    objectivePoints,
    objectiveMaxPoints,
    writtenMaxPoints: scoring.writtenMaxPoints,
    passThresholdRatio: scoring.writtenPassThreshold,
    parts,
    sections,
    writing,
  };
}
