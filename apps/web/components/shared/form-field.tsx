"use client";

import { Field, FieldError, FieldLabel } from "@/components/ui/field";
import { cn } from "@/lib/utils";

/** Simple labeled form field matching the previous Field API. */
export function FormField({
  label,
  error,
  children,
  className,
  htmlFor,
}: {
  label: React.ReactNode;
  error?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <Field data-invalid={error ? true : undefined} className={cn(className)}>
      <FieldLabel htmlFor={htmlFor}>{label}</FieldLabel>
      {children}
      {error ? <FieldError>{error}</FieldError> : null}
    </Field>
  );
}
