import { ThemeSwitch } from "../../components/shared/theme-switch";
import { AuthVisual } from "../../features/auth/auth-form";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(480px,0.9fr)_minmax(520px,1.1fr)]">
      <section className="relative flex items-center justify-center p-5 sm:p-8">
        <div className="absolute top-4 right-4">
          <ThemeSwitch />
        </div>
        <div className="w-full max-w-md">{children}</div>
      </section>
      <AuthVisual />
    </main>
  );
}
