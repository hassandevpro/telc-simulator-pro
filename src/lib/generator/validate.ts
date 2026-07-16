import { getPart } from "@/config/exam-structure";
import type { ExamStructure } from "@/types/exam";
import { partContentPayloadSchema } from "@/lib/validators";
import type { GeneratedExam, GeneratedPart } from "./types";

export interface ValidationResult {
  ok: boolean;
  errors: string[];
}

/**
 * Contrôle qualité d'un Teil généré, en deux étages :
 *   1. FORME — le schéma Zod du PUT admin (aucun contenu invalide n'entrerait
 *      en base) ;
 *   2. SÉMANTIQUE telc — nombre d'items conforme à la structure, positions
 *      1..n uniques, clés de correction pointant vers une option existante,
 *      présence effective de distracteurs, unicité des bonnes réponses.
 * Renvoie toutes les erreurs d'un coup (pas de court-circuit) pour un
 * diagnostic complet après génération.
 */
export function validatePart(
  structure: ExamStructure,
  sectionId: string,
  partId: string,
  part: GeneratedPart,
): ValidationResult {
  const errors: string[] = [];
  const where = `${sectionId}/${partId}`;

  const parsed = partContentPayloadSchema.safeParse(part);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(`[${where}] forme: ${issue.path.join(".")} — ${issue.message}`);
    }
    // Sans forme valide, les contrôles sémantiques ne sont pas fiables.
    return { ok: false, errors };
  }

  const spec = getPart(structure, sectionId as never, partId);
  if (!spec) {
    errors.push(`[${where}] structure inconnue.`);
    return { ok: false, errors };
  }

  // Nombre d'items.
  if (part.questions.length !== spec.itemCount) {
    errors.push(
      `[${where}] ${part.questions.length} question(s) au lieu de ${spec.itemCount}.`,
    );
  }
  // Positions 1..n uniques et contiguës.
  const positions = part.questions.map((q) => q.position).sort((a, b) => a - b);
  positions.forEach((p, i) => {
    if (p !== i + 1) errors.push(`[${where}] position attendue ${i + 1}, obtenue ${p}.`);
  });
  // Barème conforme.
  for (const q of part.questions) {
    if (q.points !== spec.pointsPerItem) {
      errors.push(
        `[${where}] item ${q.position}: ${q.points} pts au lieu de ${spec.pointsPerItem}.`,
      );
    }
  }

  // Contrôles spécifiques au type.
  if (part.type === "TITLE_MATCHING") {
    const optionCount = spec.optionCount ?? spec.itemCount * 2;
    const ids = part.shared.titles.map((t) => t.id);
    if (part.shared.titles.length !== optionCount) {
      errors.push(
        `[${where}] ${part.shared.titles.length} titres au lieu de ${optionCount}.`,
      );
    }
    const idSet = new Set(ids);
    if (idSet.size !== ids.length) errors.push(`[${where}] id de titre dupliqué.`);
    const keys = part.questions.map((q) => q.answerKey);
    for (const k of keys) {
      if (k === null || !idSet.has(k)) {
        errors.push(`[${where}] clé « ${k} » ne pointe vers aucun titre.`);
      }
    }
    if (new Set(keys).size !== keys.length) {
      errors.push(`[${where}] deux textes renvoient au même titre.`);
    }
    const distractors = optionCount - part.questions.length;
    if (distractors < 1) {
      errors.push(`[${where}] aucun distracteur (${distractors}).`);
    }
    // Aucun texte vide / trop court (garde-fou B2).
    for (const q of part.questions) {
      const text = (q.content as { text: string }).text;
      if (text.trim().split(/\s+/).length < 25) {
        errors.push(`[${where}] item ${q.position}: texte trop court pour B2.`);
      }
    }
  }

  if (part.type === "MULTIPLE_CHOICE") {
    // Texte source obligatoire pour la lecture (absent pour Hören, mais ce
    // validateur ne sert le MULTIPLE_CHOICE que dans Lesen/Sprachbausteine ;
    // on n'exige la source que si le Teil relève de la lecture).
    if (sectionId === "lesen" && !part.shared.sourceText?.trim()) {
      errors.push(`[${where}] texte source manquant.`);
    }
    for (const q of part.questions) {
      const content = q.content as {
        question: string;
        options: { id: string; text: string }[];
      };
      const ids = content.options.map((o) => o.id);
      const idSet = new Set(ids);
      if (idSet.size !== ids.length) {
        errors.push(`[${where}] item ${q.position}: id d'option dupliqué.`);
      }
      const texts = content.options.map((o) => o.text.trim());
      if (new Set(texts).size !== texts.length) {
        errors.push(`[${where}] item ${q.position}: deux options identiques.`);
      }
      if (q.answerKey === null || !idSet.has(q.answerKey)) {
        errors.push(
          `[${where}] item ${q.position}: clé « ${q.answerKey} » hors options.`,
        );
      }
      if (content.options.length < 2) {
        errors.push(`[${where}] item ${q.position}: moins de deux options.`);
      }
    }
  }

  if (part.type === "AD_MATCHING") {
    const optionCount = spec.optionCount ?? 12;
    const keys = part.shared.ads.map((a) => a.key);
    const keySet = new Set(keys);
    if (part.shared.ads.length !== optionCount) {
      errors.push(
        `[${where}] ${part.shared.ads.length} annonces au lieu de ${optionCount}.`,
      );
    }
    if (keySet.size !== keys.length) errors.push(`[${where}] clé d'annonce dupliquée.`);

    const allowX = spec.allowNoAnswer === true;
    const usedAdKeys: string[] = [];
    for (const q of part.questions) {
      const k = q.answerKey;
      if (k === "X") {
        if (!allowX) errors.push(`[${where}] item ${q.position}: X interdit ici.`);
        continue;
      }
      if (k === null || !keySet.has(k)) {
        errors.push(`[${where}] item ${q.position}: clé « ${k} » hors annonces.`);
      } else {
        usedAdKeys.push(k);
      }
    }
    // Chaque annonce est utilisée au plus une fois.
    if (new Set(usedAdKeys).size !== usedAdKeys.length) {
      errors.push(`[${where}] une annonce est attribuée à deux situations.`);
    }
  }

  if (part.type === "CLOZE_DROPDOWN") {
    const text = part.shared.text ?? "";
    const withBank = Array.isArray(part.shared.wordBank);

    // Chaque lacune doit avoir son marqueur {{i}} dans le texte.
    for (const q of part.questions) {
      const gapIndex = (q.content as { gapIndex: number }).gapIndex;
      if (gapIndex !== q.position) {
        errors.push(`[${where}] item ${q.position}: gapIndex ${gapIndex} ≠ position.`);
      }
      if (!text.includes(`{{${gapIndex}}}`)) {
        errors.push(`[${where}] marqueur {{${gapIndex}}} absent du texte.`);
      }
    }

    if (withBank) {
      // Teil 2 : banque commune A–O, chaque mot au plus une fois.
      const optionCount = spec.optionCount ?? 15;
      const bank = part.shared.wordBank!;
      const ids = bank.map((w) => w.id);
      const idSet = new Set(ids);
      if (bank.length !== optionCount) {
        errors.push(`[${where}] banque de ${bank.length} mots au lieu de ${optionCount}.`);
      }
      if (idSet.size !== ids.length) errors.push(`[${where}] id de banque dupliqué.`);
      if (new Set(bank.map((w) => w.text)).size !== bank.length) {
        errors.push(`[${where}] mot dupliqué dans la banque.`);
      }
      const keys = part.questions.map((q) => q.answerKey);
      for (const k of keys) {
        if (k === null || !idSet.has(k)) {
          errors.push(`[${where}] clé « ${k} » absente de la banque.`);
        }
      }
      if (new Set(keys).size !== keys.length) {
        errors.push(`[${where}] un mot de la banque est utilisé deux fois.`);
      }
    } else {
      // Teil 1 : options propres à chaque lacune (4 attendues).
      for (const q of part.questions) {
        const options = (q.content as { options: { id: string; text: string }[] }).options;
        const ids = options.map((o) => o.id);
        const idSet = new Set(ids);
        if (options.length < 4) {
          errors.push(`[${where}] item ${q.position}: ${options.length} options (< 4).`);
        }
        if (idSet.size !== ids.length) {
          errors.push(`[${where}] item ${q.position}: id d'option dupliqué.`);
        }
        if (new Set(options.map((o) => o.text)).size !== options.length) {
          errors.push(`[${where}] item ${q.position}: deux options identiques.`);
        }
        if (q.answerKey === null || !idSet.has(q.answerKey)) {
          errors.push(`[${where}] item ${q.position}: clé « ${q.answerKey} » hors options.`);
        }
      }
    }
  }

  if (part.type === "WRITING") {
    for (const q of part.questions) {
      const content = q.content as { prompt: string; bulletPoints: string[] };
      if (content.bulletPoints.length < 2) {
        errors.push(`[${where}] moins de deux Leitpunkte.`);
      }
      if (q.answerKey !== null) {
        errors.push(`[${where}] WRITING ne doit pas avoir de clé de correction.`);
      }
    }
  }

  return { ok: errors.length === 0, errors };
}

/** Contrôle l'examen complet : chaque Teil présent et valide. */
export function validateExam(
  structure: ExamStructure,
  exam: GeneratedExam,
): ValidationResult {
  const errors: string[] = [];
  for (const section of structure.schriftlichePruefung.sections) {
    for (const part of section.parts) {
      const key = `${section.id}/${part.id}`;
      const generated = exam.parts[key];
      if (!generated) {
        errors.push(`[${key}] Teil manquant dans l'examen généré.`);
        continue;
      }
      const r = validatePart(structure, section.id, part.id, generated);
      errors.push(...r.errors);
    }
  }
  // Trois scripts Hören attendus.
  const scriptKeys = new Set(exam.hoerenScripts.map((s) => s.partKey));
  for (const key of ["hoeren/teil-1", "hoeren/teil-2", "hoeren/teil-3"]) {
    if (!scriptKeys.has(key)) errors.push(`[${key}] script audio manquant.`);
  }
  return { ok: errors.length === 0, errors };
}
