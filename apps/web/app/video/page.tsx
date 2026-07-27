import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { ThemeSwitch } from "@/components/shared/theme-switch";

export const metadata: Metadata = {
  title: "Demo video",
  description:
    "Watch the TemporalGuard Agents of SigNoz Hackathon product demo.",
};

export default function VideoPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex w-full max-w-[1800px] items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <Link
            href="/"
            className="group flex items-center gap-3 font-semibold tracking-tight"
          >
            <span className="grid size-9 place-items-center bg-foreground text-sm font-bold text-background">
              T
            </span>
            <span>TemporalGuard</span>
          </Link>
          <div className="flex items-center gap-2">
            <a
              href="https://youtu.be/b7Bjg0PpsHw"
              target="_blank"
              rel="noreferrer"
              className="hidden items-center gap-2 border border-border px-3 py-2 text-xs font-medium transition-colors hover:bg-muted sm:flex"
            >
              Open on YouTube
              <ExternalLink className="size-3.5" aria-hidden="true" />
            </a>
            <ThemeSwitch />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-[1800px] px-4 py-8 sm:px-6 sm:py-10 lg:px-8 lg:py-12">
        <div className="mb-7 flex flex-col justify-between gap-5 border-b border-border pb-7 md:flex-row md:items-end">
          <div>
            <p className="mb-3 font-mono text-xs font-medium tracking-[0.16em] text-muted-foreground uppercase">
              Agents of SigNoz · Track 3: Build Your Own
            </p>
            <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl lg:text-6xl">
              TemporalGuard demo
            </h1>
          </div>
          <Link
            href="/overview"
            className="flex w-fit items-center gap-2 text-sm font-medium underline decoration-border-strong underline-offset-4"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
            Explore the product
          </Link>
        </div>

        <div className="border border-border-strong bg-black p-1 sm:p-2">
          <div className="aspect-video w-full">
            <iframe
              className="h-full w-full"
              src="https://www.youtube-nocookie.com/embed/b7Bjg0PpsHw?rel=0"
              title="TemporalGuard product demo"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
            />
          </div>
        </div>
      </section>
    </main>
  );
}
