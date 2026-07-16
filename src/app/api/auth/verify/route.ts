import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { consumeVerificationToken } from "@/lib/verification";

/**
 * Confirmation d'e-mail : le lien reçu par e-mail ouvre cette route (GET),
 * qui valide le jeton, marque l'utilisateur comme vérifié, puis renvoie
 * vers la page de connexion avec un indicateur de résultat.
 */
export async function GET(request: Request) {
  const origin = new URL(request.url).origin;
  const token = new URL(request.url).searchParams.get("token");

  const fail = () =>
    NextResponse.redirect(`${origin}/login?verify=invalid`);

  if (!token) return fail();

  const email = await consumeVerificationToken(token);
  if (!email) return fail();

  await db.user
    .update({ where: { email }, data: { emailVerified: new Date() } })
    .catch(() => undefined);

  return NextResponse.redirect(`${origin}/login?verify=success`);
}
