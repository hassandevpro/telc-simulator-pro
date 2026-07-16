import "server-only";

/**
 * Envoi d'e-mails transactionnels via Resend.
 * Non configuré (RESEND_API_KEY absent) : on JOURNALISE le lien au lieu
 * d'envoyer — le flux reste testable en local sans compte e-mail.
 * Variables d'environnement :
 *  - RESEND_API_KEY : clé API Resend.
 *  - EMAIL_FROM     : expéditeur vérifié (ex. "TELC Simulator <no-reply@ton-domaine>").
 *                     À défaut, le domaine de test Resend (onboarding@resend.dev).
 */

const FROM =
  process.env.EMAIL_FROM ?? "TELC Simulator Pro <onboarding@resend.dev>";

async function send(options: {
  to: string;
  subject: string;
  html: string;
  text: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log(
      `[email] (non envoyé — RESEND_API_KEY manquante) → ${options.to} : ${options.subject}\n${options.text}`,
    );
    return;
  }
  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({ from: FROM, ...options });
  if (error) throw new Error(error.message);
}

const wrap = (title: string, body: string, cta: { href: string; label: string }) => `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;max-width:520px;margin:0 auto;color:#111">
    <h2 style="font-size:18px">${title}</h2>
    <p style="font-size:14px;line-height:1.5;color:#333">${body}</p>
    <p style="margin:24px 0">
      <a href="${cta.href}" style="background:#111;color:#fff;text-decoration:none;padding:10px 18px;border-radius:6px;font-size:14px;display:inline-block">${cta.label}</a>
    </p>
    <p style="font-size:12px;color:#777">Falls der Button nicht funktioniert, kopieren Sie diesen Link:<br>${cta.href}</p>
  </div>`;

/** E-mail de confirmation d'adresse à l'inscription. */
export async function sendVerificationEmail(
  to: string,
  verifyUrl: string,
): Promise<void> {
  await send({
    to,
    subject: "Bestätigen Sie Ihre E-Mail-Adresse – TELC Simulator Pro",
    html: wrap(
      "Willkommen bei TELC Simulator Pro",
      "Bitte bestätigen Sie Ihre E-Mail-Adresse, um Ihr Konto zu aktivieren. Der Link ist 24 Stunden gültig.",
      { href: verifyUrl, label: "E-Mail bestätigen" },
    ),
    text: `Bestätigen Sie Ihre E-Mail-Adresse: ${verifyUrl}`,
  });
}
