import type { Metadata } from "next";
import { SignupForm } from "../../../features/auth/auth-form";

export const metadata: Metadata = { title: "Create workspace" };

export default function SignupPage() {
  return (
    <div className="py-8">
      <p className="mb-3 font-mono text-[11px] font-semibold tracking-[0.14em] text-primary uppercase">
        TemporalGuard
      </p>
      <h1 className="text-4xl font-bold tracking-tight">
        Create your workspace
      </h1>
      <p className="mt-2 mb-6 text-muted-foreground">
        Start with a secure owner account and a workspace for your team.
      </p>
      <SignupForm />
    </div>
  );
}
