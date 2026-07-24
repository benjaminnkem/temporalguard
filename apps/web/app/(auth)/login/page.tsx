import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginForm } from "../../../features/auth/auth-form";

export const metadata: Metadata = { title: "Sign in" };

export default function LoginPage() {
  return (
    <div>
      <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
        TemporalGuard
      </p>
      <h1 className="text-4xl font-bold tracking-tight">Welcome back.</h1>
      <p className="mt-2 mb-7 text-muted-foreground">
        Sign in to investigate workflow health and violations.
      </p>
      <Suspense fallback={<div className="h-72 animate-pulse bg-muted" />}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
