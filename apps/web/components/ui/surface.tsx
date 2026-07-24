import { cn } from "../../lib/utils";

export function Card({
  className,
  children,
  decoration = "none",
  style,
}: {
  className?: string;
  children: React.ReactNode;
  decoration?: "none" | "tape" | "tack";
  style?: React.CSSProperties;
}) {
  return (
    <section
      className={cn(
        "relative rounded-[var(--radius-lg)] border-2 border-border bg-card text-card-foreground shadow-[4px_4px_0_var(--shadow-ink)] transition-[transform,box-shadow] duration-100 hover:-translate-y-0.5 hover:rotate-[0.15deg] hover:shadow-[6px_6px_0_var(--shadow-ink)]",
        className,
      )}
      style={style}
    >
      {decoration === "tape" ? (
        <span
          aria-hidden="true"
          className="absolute -top-3 left-1/2 z-10 h-6 w-20 -translate-x-1/2 -rotate-2 bg-muted/80"
        />
      ) : null}
      {decoration === "tack" ? (
        <span
          aria-hidden="true"
          className="absolute -top-2 left-1/2 z-10 size-4 -translate-x-1/2 rounded-full border-2 border-border bg-primary shadow-[2px_2px_0_var(--shadow-ink)]"
        />
      ) : null}
      {children}
    </section>
  );
}

export function Badge({
  children,
  tone = "neutral",
  className,
}: {
  children: React.ReactNode;
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "primary";
  className?: string;
}) {
  const tones = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success-subtle text-success",
    warning: "bg-warning-subtle text-warning",
    danger: "bg-destructive-subtle text-destructive",
    info: "bg-info-subtle text-info",
    primary: "bg-primary-subtle text-primary-subtle-foreground",
  };
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center rounded-[var(--radius-sm)] border border-current px-2 text-sm font-medium -rotate-[0.4deg]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-[var(--radius-sm)] border-2 border-dashed border-border/40 bg-muted",
        className,
      )}
      aria-hidden="true"
    />
  );
}
