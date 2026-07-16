import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { createVerificationToken } from "@/lib/verification";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  password: z.string().min(8).max(200),
});

/** Inscription candidat : validation Zod, unicité e-mail, hash bcrypt. */
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Ungültige Angaben. Passwort: mindestens 8 Zeichen." },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  try {
    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "Diese E-Mail-Adresse ist bereits registriert." },
        { status: 409 },
      );
    }

    await db.user.create({
      data: {
        email,
        name: parsed.data.name,
        passwordHash: await bcrypt.hash(parsed.data.password, 10),
        role: "STUDENT",
        plan: "FREE",
        // emailVerified reste null : la connexion est refusée tant que
        // l'adresse n'est pas confirmée.
      },
    });

    // Envoi du lien de vérification (best-effort : un échec d'e-mail ne doit
    // pas faire échouer l'inscription — l'utilisateur pourra le renvoyer).
    try {
      const token = await createVerificationToken(email);
      const verifyUrl = `${new URL(request.url).origin}/api/auth/verify?token=${token}`;
      await sendVerificationEmail(email, verifyUrl);
    } catch (cause) {
      console.error("[register] envoi vérification échoué", cause);
    }

    return NextResponse.json(
      { ok: true, verificationRequired: true },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Registrierung derzeit nicht möglich." },
      { status: 500 },
    );
  }
}
