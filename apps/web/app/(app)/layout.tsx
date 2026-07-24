import { AppShell } from "../../features/shell/app-shell";
import { Suspense } from "react";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="grid min-h-screen place-items-center text-sm text-muted-foreground">
          Loading TemporalGuard…
        </div>
      }
    >
      <AppShell>{children}</AppShell>
    </Suspense>
  );
}
