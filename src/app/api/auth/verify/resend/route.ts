import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { createVerificationToken } from "@/lib/verification";

const schema = z.object({ email: z.email() });

/**
 * Renvoi du lien de vérification. Réponse volontairement uniforme (200)
 * que le compte existe ou non, et qu'il soit déjà vérifié ou non : on ne
 * révèle jamais l'existence d'une adresse.
 */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: true });
  }
  const email = parsed.data.email.toLowerCase();

  const user = await db.user.findUnique({ where: { email } });
  if (user && !user.emailVerified) {
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
