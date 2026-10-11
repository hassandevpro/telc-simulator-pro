import "server-only";
import { db } from "@/lib/db";

/**
 * REMBOURSEMENT MANUEL d'un crédit d'examen, décidé par un administrateur
 * (panne technique, démarrage par erreur…). Il n'est jamais automatique :
 * le contenu de l'examen est visible dès le démarrage, un remboursement
 * automatique à l'abandon permettrait de le lire gratuitement.
 *
 * Garanties (une seule transaction PostgreSQL) :
 *  - seule une session réellement DÉBITÉE est remboursable (CHARGED ou
 *    CHARGED_AT_SUBMIT) — pas un rejeu gratuit, pas un examen déjà remboursé ;
 *  - UN SEUL remboursement par session : la transition est un UPDATE
 *    conditionnel, et le journal (CreditAdjustment) a sessionId unique —
 *    deux clics simultanés ne recréditent qu'une fois ;
 *  - c'est le compte réellement débité qui est recrédité (le pool du centre
 *    pour un étudiant de centre) ;
 *  - une session encore EN COURS est fermée (EXPIRED) : on ne rembourse pas
 *    un examen que le candidat peut continuer à passer ;
 *  - chaque remboursement est tracé : qui, quand, pourquoi.
 */

export type RefundResult =
  | { ok: true; accountId: string; amount: number }
  | { ok: false; status: number; code: string; error: string };

const REFUNDABLE = ["CHARGED", "CHARGED_AT_SUBMIT"];

export async function refundSessionCredit(params: {
  sessionId: string;
  adminId: string;
  reason: string;
}): Promise<RefundResult> {
  const { sessionId, adminId } = params;
  const reason = params.reason.trim();
  if (reason.length < 3) {
    return { ok: false, status: 400, code: "REASON_REQUIRED", error: "Begründung erforderlich." };
  }

  const row = await db.examSession.findUnique({
    where: { id: sessionId },
    select: { userId: true, status: true, creditStatus: true, creditAccountId: true },
  });
  if (!row) return { ok: false, status: 404, code: "NOT_FOUND", error: "Sitzung unbekannt." };
  if (row.creditStatus === "REFUNDED") {
    return { ok: false, status: 409, code: "ALREADY_REFUNDED", error: "Bereits erstattet." };
  }
  if (!row.creditStatus || !REFUNDABLE.includes(row.creditStatus)) {
    return {
      ok: false,
      status: 409,
      code: "NOT_REFUNDABLE",
      error: "Für diese Sitzung wurde kein Credit abgebucht.",
    };
  }
  const accountId = row.creditAccountId ?? row.userId;

  try {
    await db.$transaction(async (tx) => {
      const claimed = await tx.examSession.updateMany({
        where: { id: sessionId, creditStatus: { in: REFUNDABLE } },
        data: {
          creditStatus: "REFUNDED",
          // Épreuve encore ouverte : fermée, pour qu'elle ne continue pas gratuitement.
          ...(row.status === "IN_PROGRESS" ? { status: "EXPIRED" as const } : {}),
        },
      });
      if (claimed.count === 0) throw new AlreadyRefunded();
      await tx.creditAdjustment.create({
        data: { sessionId, accountId, amount: 1, reason, adminId },
      });
      await tx.user.update({
        where: { id: accountId },
        data: { credits: { increment: 1 } },
      });
    });
  } catch (cause) {
    // Unicité du journal ou transition déjà prise : un autre remboursement a gagné.
    if (cause instanceof AlreadyRefunded || isUniqueViolation(cause)) {
      return { ok: false, status: 409, code: "ALREADY_REFUNDED", error: "Bereits erstattet." };
    }
    throw cause;
  }
  return { ok: true, accountId, amount: 1 };
}

class AlreadyRefunded extends Error {}

function isUniqueViolation(cause: unknown): boolean {
  return (
    typeof cause === "object" &&
    cause !== null &&
    (cause as { code?: string }).code === "P2002"
  );
}
