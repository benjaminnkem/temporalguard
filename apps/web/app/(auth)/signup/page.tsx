import type { Metadata } from "next";
import { SignupForm } from "../../../features/auth/auth-form";

export const metadata: Metadata = { title: "Create workspace" };

export default function SignupPage() {
  return (
    <div className="py-8">
      <p className="mb-2 inline-block -rotate-1 bg-warning-subtle px-2 text-base font-semibold text-foreground">
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
