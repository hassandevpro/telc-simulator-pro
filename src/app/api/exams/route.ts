import { NextResponse } from "next/server";

/** API examens — lecture des examens publiés (Sprint 3). */
export async function GET() {
  return NextResponse.json(
    { error: "Non implémenté — Sprint 3." },
    { status: 501 },
  );
}
