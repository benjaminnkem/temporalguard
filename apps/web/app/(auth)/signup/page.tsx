import type { Metadata } from "next";
import { SignupForm } from "@/features/auth/auth-form";
import { AuthCardBody, AuthCardHeader } from "@/features/auth/auth-shell";

export const metadata: Metadata = { title: "Create workspace" };

export default function SignupPage() {
  return (
    <>
      <AuthCardHeader
        title="Create your workspace"
        description="Start with a secure owner account and a workspace for your team."
      />
      <AuthCardBody>
        <SignupForm />
      </AuthCardBody>
    </>
  );
}
