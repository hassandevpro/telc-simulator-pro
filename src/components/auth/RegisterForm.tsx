"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button, Card } from "@/components/ui";

const registerFormSchema = z
  .object({
    name: z.string().min(2, "Bitte Ihren Namen angeben."),
    email: z.email("Bitte eine gültige E-Mail-Adresse angeben."),
    password: z.string().min(8, "Mindestens 8 Zeichen."),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    path: ["confirm"],
    message: "Die Passwörter stimmen nicht überein.",
  });

type RegisterValues = z.infer<typeof registerFormSchema>;

const inputClass =
  "mt-1 w-full border border-border bg-background px-2.5 py-1.5 text-[13px] " +
  "rounded-sm focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-accent";

/** Inscription : POST /api/auth/register puis connexion automatique. */
export function RegisterForm() {
  const [serverError, setServerError] = useState<string | null>(null);
  const [registeredEmail, setRegisteredEmail] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({ resolver: zodResolver(registerFormSchema) });

  const onSubmit = async (values: RegisterValues) => {
    setServerError(null);
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: values.name,
        email: values.email,
        password: values.password,
      }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;
      setServerError(data?.error ?? "Registrierung fehlgeschlagen.");
      return;
    }

    // Pas de connexion automatique : l'adresse doit d'abord être confirmée.
    setRegisteredEmail(values.email);
  };

  if (registeredEmail) {
    return (
      <Card className="w-full max-w-sm p-6">
        <h1 className="text-base font-semibold">Fast geschafft</h1>
        <p className="mt-3 text-[13px] text-muted">
          Wir haben eine Bestätigungs-E-Mail an{" "}
          <span className="font-medium text-foreground">{registeredEmail}</span>{" "}
          gesendet. Öffnen Sie den Link darin, um Ihr Konto zu aktivieren, und
          melden Sie sich anschließend an.
        </p>
        <p className="mt-4 text-[12px] text-muted">
          <Link
            href="/login"
            className="text-accent underline underline-offset-2"
          >
            Zur Anmeldung
          </Link>
        </p>
      </Card>
    );
  }

  const field = (
    id: keyof RegisterValues,
    label: string,
    type: string,
    autoComplete: string,
  ) => (
    <div>
      <label htmlFor={`reg-${id}`} className="text-[13px] font-medium">
        {label}
      </label>
      <input
        id={`reg-${id}`}
        type={type}
        autoComplete={autoComplete}
        className={inputClass}
        {...register(id)}
      />
      {errors[id] ? (
        <p className="mt-1 text-[12px] text-danger">{errors[id]?.message}</p>
      ) : null}
    </div>
  );

  return (
    <Card className="w-full max-w-sm p-6">
      <h1 className="text-base font-semibold">Registrieren</h1>
      <form
        className="mt-4 space-y-3"
        onSubmit={(event) => void handleSubmit(onSubmit)(event)}
      >
        {field("name", "Name", "text", "name")}
        {field("email", "E-Mail", "email", "email")}
        {field("password", "Passwort", "password", "new-password")}
        {field("confirm", "Passwort wiederholen", "password", "new-password")}

        {serverError ? (
          <p className="text-[12px] text-danger">{serverError}</p>
        ) : null}

        <Button
          type="submit"
          variant="primary"
          className="w-full"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Wird registriert…" : "Konto erstellen"}
        </Button>
      </form>
      <p className="mt-4 text-[12px] text-muted">
        Bereits registriert?{" "}
        <Link
          href="/login"
          className="text-accent underline underline-offset-2"
        >
          Anmelden
        </Link>
      </p>
    </Card>
  );
}
