import { Suspense } from "react";
import { Spinner } from "@/components/ui/spinner";
import { AppShell } from "@/features/shell/app-shell";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-svh place-items-center gap-3 text-sm text-muted-foreground">
          <Spinner className="size-5" />
          Loading TemporalGuard…
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
