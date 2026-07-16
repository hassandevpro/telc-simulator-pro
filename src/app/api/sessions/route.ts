import { NextResponse } from "next/server";

/**
 * API sessions — création, autosave, soumission (Sprints 2 et 8).
 * v1 : la persistance des sessions est en LocalStorage ; ces routes
 * s'activent avec la bascule ApiSessionRepository (v2) et la
 * revalidation serveur des délais à la remise.
 */
export async function GET() {
  return NextResponse.json(
    { error: "Non implémenté — Sprint 2/8." },
    { status: 501 },
  );
}

export async function POST() {
  return NextResponse.json(
    { error: "Non implémenté — Sprint 2/8." },
    { status: 501 },
  );
}
