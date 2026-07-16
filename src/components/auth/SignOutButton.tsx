"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui";

/** Déconnexion — retour à la landing. */
export function SignOutButton() {
  return (
    <Button
      variant="ghost"
      onClick={() => void signOut({ callbackUrl: "/" })}
    >
      Abmelden
    </Button>
  );
}
