import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { issueAudioUrl } from "@/lib/audio-access";

/**
 * Émission d'une URL signée pour l'audio d'un Teil Hören.
 *
 * POST (et non GET) : l'appel a un effet — il consomme une des émissions
 * autorisées — et ne doit être ni préchargé ni mis en cache.
 * Toutes les vérifications vivent dans lib/audio-access.ts ; ses limites
 * (URL valable jusqu'à expiration, audio enregistrable) y sont documentées.
 */
export async function POST(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ sessionId: string; sectionId: string; partId: string }>;
  },
) {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Nicht angemeldet." }, { status: 401 });
  }
  const { sessionId, sectionId, partId } = await params;

  const result = await issueAudioUrl({ sessionId, userId, sectionId, partId });
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, code: result.code },
      { status: result.status, headers: { "Cache-Control": "no-store" } },
    );
  }
  return NextResponse.json(
    { url: result.url, expiresAt: result.expiresAt, kind: result.kind },
    { headers: { "Cache-Control": "no-store" } },
  );
}
