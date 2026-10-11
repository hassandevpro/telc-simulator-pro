import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { createVerificationToken } from "@/lib/verification";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({ email: z.email() });

/**
 * Renvoi du lien de vérification. Réponse volontairement uniforme (200)
 * que le compte existe ou non, et qu'il soit déjà vérifié ou non : on ne
 * révèle jamais l'existence d'une adresse.
 */
export async function POST(request: Request) {
  // Évite d'utiliser la route pour bombarder une boîte de réception.
  if (!rateLimit(`resend:ip:${clientIp(request)}`, 5, 60 * 60_000).allowed) {
    return NextResponse.json({ ok: true });
  }
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const email = parsed.data.email.toLowerCase();

  const user = await db.user.findUnique({ where: { email } });
  // « Vérifié » = prouvé par lien ou Google (les comptes historiques marqués
  // vérifiés d'office peuvent ainsi encore confirmer leur adresse).
  if (user && !user.emailVerifiedBy) {
    try {
      const token = await createVerificationToken(email);
      const verifyUrl = `${new URL(request.url).origin}/api/auth/verify?token=${token}`;
      await sendVerificationEmail(email, verifyUrl);
    } catch (cause) {
      console.error("[verify/resend] envoi échoué", cause);
    }
  }

  return NextResponse.json({ ok: true });
}
