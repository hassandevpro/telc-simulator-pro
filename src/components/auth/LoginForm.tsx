"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { signIn } from "next-auth/react";
import { Button, Card } from "@/components/ui";

const loginSchema = z.object({
  email: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
  password: z.string().min(1, "Bitte das Passwort angeben."),
});

type LoginValues = z.infer<typeof loginSchema>;

const inputClass =
  "mt-1 w-full border border-border bg-background px-2.5 py-1.5 text-[13px] " +
  "rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

/** Formulaire de connexion — NextAuth Credentials, sans redirection dure. */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [authError, setAuthError] = useState<string | null>(null);
  const [resendInfo, setResendInfo] = useState<string | null>(null);

  const verifyState = searchParams.get("verify");

  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (values: LoginValues) => {
    setAuthError(null);
    setResendInfo(null);
    const result = await signIn("credentials", {
      email: values.email,
      password: values.password,
      redirect: false,
    });
    if (result?.error) {
      setAuthError(
        "Anmeldung fehlgeschlagen. E-Mail/Passwort falsch — oder E-Mail noch nicht bestätigt.",
      );
      return;
    }
    router.push(searchParams.get("callbackUrl") ?? "/dashboard");
    router.refresh();
  };

  const resendVerification = async () => {
    setResendInfo(null);
    const email = getValues("email");
    if (!email) {
      setResendInfo("Bitte zuerst Ihre E-Mail-Adresse eingeben.");
      return;
    }
    await fetch("/api/auth/verify/resend", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setResendInfo(
      "Falls ein Konto existiert und noch nicht bestätigt ist, wurde eine E-Mail gesendet.",
    );
  };

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-base font-semibold">Anmelden</h1>

      {verifyState === "success" ? (
        <p className="mt-3 rounded-sm border border-border bg-surface px-3 py-2 text-[12px] text-foreground">
          E-Mail bestätigt. Sie können sich jetzt anmelden.
        </p>
      ) : null}
      {verifyState === "invalid" ? (
        <p className="mt-3 rounded-sm border border-danger px-3 py-2 text-[12px] text-danger">
          Der Bestätigungslink ist ungültig oder abgelaufen. Melden Sie sich an
          und fordern Sie einen neuen Link an.
        </p>
      ) : null}

      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        <div>
          <label htmlFor="login-email" className="text-[13px] font-medium">
            E-Mail
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            className={inputClass}
            {...register("email")}
          />
          {errors.email ? (
            <p className="mt-1 text-[12px] text-danger">
              {errors.email.message}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="login-password" className="text-[13px] font-medium">
            Passwort
          </label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            className={inputClass}
            {...register("password")}
          />
          {errors.password ? (
            <p className="mt-1 text-[12px] text-danger">
              {errors.password.message}
            </p>
          ) : null}
        </div>

        {authError ? (
          <div className="space-y-1">
            <p className="text-[12px] text-danger">{authError}</p>
            <button
              type="button"
              onClick={() => void resendVerification()}
              className="text-[12px] text-accent underline underline-offset-2"
            >
              Bestätigungs-E-Mail erneut senden
            </button>
          </div>
        ) : null}
        {resendInfo ? (
          <p className="text-[12px] text-muted">{resendInfo}</p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Wird angemeldet…" : "Anmelden"}
        </Button>
      </form>
      <p className="mt-4 text-[12px] text-muted">
        Noch kein Konto?{" "}
        <Link
          href="/register"
          className="text-accent underline underline-offset-2"
        >
          Registrieren
        </Link>
      </p>
    </Card>
  );
}
