import type { Metadata } from "next";
import { LoginForm } from "../../../features/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <p className="mb-2 text-sm font-semibold text-primary">TemporalGuard</p>
      <h1 className="text-3xl font-semibold tracking-tight">Welcome back</h1>
      <p className="mt-2 mb-7 text-muted-foreground">
        Sign in to investigate workflow health and violations.
      </p>
      <LoginForm />
    </div>
  );
}
