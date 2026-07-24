import type { Metadata } from "next";
import { Suspense } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { LoginForm } from "@/features/auth/auth-form";
import { AuthCardBody, AuthCardHeader } from "@/features/auth/auth-shell";

export const metadata: Metadata = { title: "Sign in" };

function LoginFallback() {
  return (
    <div className="grid gap-4" aria-label="Loading sign in form">
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-10 w-full rounded-xl" />
      <Skeleton className="h-11 w-full rounded-xl" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <>
      <AuthCardHeader
        title="Welcome back"
        description="Sign in to investigate workflow health and violations."
      />
      <AuthCardBody>
        <Suspense fallback={<LoginFallback />}>
          <LoginForm />
        </Suspense>
      </AuthCardBody>
    </>
  );
}
