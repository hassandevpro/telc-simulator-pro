import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-guard";
import { db } from "@/lib/db";

/**
 * Statistiques d'administration. v1 : compteurs base (utilisateurs,
 * examens, questions) — les statistiques de sessions arrivent avec la
 * persistance v2 (les sessions vivent en LocalStorage côté candidat).
 */
export async function GET() {
  if (!(await requireAdmin())) {
    return NextResponse.json({ error: "Zugriff verweigert." }, { status: 403 });
  }
  try {
    const [users, exams, published, questions] = await Promise.all([
      db.user.count(),
      db.exam.count(),
      db.exam.count({ where: { isPublished: true } }),
      db.question.count(),
    ]);
    return NextResponse.json({ users, exams, published, questions });
  } catch {
    return NextResponse.json(
      { error: "Datenbank nicht erreichbar." },
      { status: 503 },
    );
  }
}
