import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/db";
import { sendVerificationEmail } from "@/lib/email";
import { createVerificationToken } from "@/lib/verification";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const registerSchema = z.object({
  name: z.string().min(2).max(100),
  email: z.email(),
  password: z.string().min(8).max(200),
  // Numéro de téléphone (WhatsApp) — 6 à 20 caractères, chiffres et
  // symboles usuels (+, espaces, tirets). Sert au paiement et au contact.
  phone: z
    .string()
    .min(6)
    .max(20)
    .regex(/^[+()\d][\d\s()-]{5,}$/, "Numéro invalide."),
});

/** Inscription candidat : validation Zod, unicité e-mail, hash bcrypt. */
export async function POST(request: Request) {
  // Anti-abus : 5 inscriptions / heure / IP (limiteur en mémoire, cf.
  // lib/rate-limit.ts pour sa portée).
  const limited = rateLimit(`register:ip:${clientIp(request)}`, 5, 60 * 60_000);
  if (!limited.allowed) {
    return NextResponse.json(
      { error: "Zu viele Versuche. Bitte später erneut versuchen." },
      { status: 429, headers: { "Retry-After": String(limited.retryAfterSeconds) } },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error:
          "Ungültige Angaben. Passwort: mindestens 8 Zeichen; bitte auch eine gültige Telefonnummer angeben.",
      },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  try {
    // La vérification d'e-mail reste OPTIONNELLE pour la CONNEXION
    // (EMAIL_VERIFICATION_REQUIRED="true" la rend obligatoire). Mais le
    // compte n'est plus marqué « vérifié » d'office : `emailVerified` ne
    // prouve que ce qui a été prouvé (lien consommé, ou Google).
    const verificationRequired =
      process.env.EMAIL_VERIFICATION_REQUIRED === "true";

    // Haché AVANT la recherche : une réponse « déjà inscrit » prend alors le
    // même temps qu'une création (pas de canal temporel sur l'existence).
    const passwordHash = await bcrypt.hash(parsed.data.password, 10);

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      // Vérification obligatoire : réponse IDENTIQUE à une création, pour
      // ne pas révéler qu'une adresse est inscrite (le titulaire réel
      // utilise « Passwort vergessen » / la connexion habituelle).
      // Vérification facultative : le nouvel inscrit est connecté aussitôt
      // après — l'échec de cette connexion révélerait de toute façon
      // l'existence du compte, le 409 explicite reste donc la réponse la
      // plus honnête pour l'utilisateur.
      if (verificationRequired) {
        return NextResponse.json(
          { ok: true, verificationRequired },
          { status: 201 },
        );
      }
      return NextResponse.json(
        { error: "Diese E-Mail-Adresse ist bereits registriert." },
        { status: 409 },
      );
    }

    await db.user.create({
      data: {
        email,
        name: parsed.data.name,
        phone: parsed.data.phone.trim(),
        passwordHash,
        role: "STUDENT",
        plan: "FREE",
        emailVerified: null,
      },
    });

    // Lien de vérification envoyé dans tous les cas (best-effort) : c'est
    // lui qui rend possible, plus tard, la connexion « Mit Google ».
    try {
      const token = await createVerificationToken(email);
      const verifyUrl = `${new URL(request.url).origin}/api/auth/verify?token=${token}`;
      await sendVerificationEmail(email, verifyUrl);
    } catch (cause) {
      console.error("[register] envoi vérification échoué", cause);
    }

    return NextResponse.json(
      { ok: true, verificationRequired },
      { status: 201 },
    );
  } catch {
    return NextResponse.json(
      { error: "Registrierung derzeit nicht möglich." },
      { status: 500 },
    );
  }
}
