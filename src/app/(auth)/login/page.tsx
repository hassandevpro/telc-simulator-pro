import { Suspense } from "react";
import { LoginForm } from "@/components/auth";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
