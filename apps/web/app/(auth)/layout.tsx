import { ThemeSwitch } from "@/components/shared/theme-switch";
import { AuthCard } from "@/features/auth/auth-shell";
import { AuthVisual } from "@/features/auth/auth-form";
import Link from "next/link";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(420px,0.95fr)_minmax(520px,1.05fr)]">
      <section className="relative flex flex-col items-center overflow-y-auto p-5 sm:p-8">
        <div className="absolute top-4 right-4 z-10">
          <ThemeSwitch />
        </div>
        <div className="flex w-full max-w-md flex-1 flex-col justify-center gap-6 py-12">
          <Link
            href="/login"
            className="flex items-center gap-2.5 font-semibold"
          >
            <span className="grid size-9 place-items-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
              T
            </span>
            <span className="text-sm tracking-tight">TemporalGuard</span>
          </Link>
          <AuthCard>{children}</AuthCard>
        </div>
      </section>
      <AuthVisual />
    </main>
  );
}
