import type { Metadata } from "next";
import { LoginForm } from "../../../features/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <p className="mb-2 inline-block -rotate-1 bg-warning-subtle px-2 text-base font-semibold text-foreground">
        TemporalGuard
      </p>
      <h1 className="text-4xl font-bold tracking-tight">Welcome back!</h1>
      <p className="mt-2 mb-7 text-muted-foreground">
        Sign in to investigate workflow health and violations.
      </p>
      <LoginForm />
    </div>
  );
}
