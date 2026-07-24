import { cn } from "../../lib/utils";

export function Card({
  className,
  children,
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
        "relative border border-border-strong bg-card text-card-foreground",
        className,
      )}
      style={style}
    >
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
        "inline-flex min-h-6 items-center border border-current px-2 font-mono text-[10px] font-medium tracking-[0.06em] uppercase",
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
      className={cn("animate-pulse border border-border bg-muted", className)}
      aria-hidden="true"
    />
  );
}
