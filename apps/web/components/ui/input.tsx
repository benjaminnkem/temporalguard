import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

export function Input({
  className,
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "min-h-11 w-full rounded-[var(--radius-md)] border-2 border-border bg-input px-3 text-base text-foreground shadow-[2px_2px_0_color-mix(in_srgb,var(--shadow-ink)_18%,transparent)] transition-[border,box-shadow,transform] duration-100 placeholder:text-muted-foreground disabled:opacity-60 focus:border-info focus:shadow-[3px_3px_0_color-mix(in_srgb,var(--info)_30%,transparent)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Textarea({
  className,
  ...props
}: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cn(
        "min-h-24 w-full resize-y rounded-[var(--radius-md)] border-2 border-border bg-input px-3 py-2 text-base text-foreground shadow-[2px_2px_0_color-mix(in_srgb,var(--shadow-ink)_18%,transparent)] transition-[border,box-shadow] duration-100 placeholder:text-muted-foreground focus:border-info focus:shadow-[3px_3px_0_color-mix(in_srgb,var(--info)_30%,transparent)] focus:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="grid gap-1.5 text-sm font-medium">
      <span>{label}</span>
      {children}
      {error ? (
        <span className="text-xs text-destructive" role="alert">
          {error}
        </span>
      ) : hint ? (
        <span className="text-xs font-normal text-muted-foreground">
          {hint}
        </span>
      ) : null}
    </label>
  );
}
