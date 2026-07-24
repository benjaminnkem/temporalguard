"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] border-2 px-3 text-base font-medium shadow-[4px_4px_0_var(--shadow-ink)] transition-[background,color,border,box-shadow,transform] duration-100 disabled:pointer-events-none disabled:opacity-50 hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[2px_2px_0_var(--shadow-ink)] active:translate-x-1 active:translate-y-1 active:shadow-none",
  {
    variants: {
      variant: {
        primary:
          "border-border bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary:
          "border-border bg-surface text-foreground hover:bg-info hover:text-white",
        ghost:
          "border-transparent bg-transparent text-muted-foreground shadow-none hover:border-border hover:bg-muted hover:text-foreground hover:shadow-[2px_2px_0_var(--shadow-ink)]",
        destructive: "border-border bg-destructive text-white hover:opacity-90",
      },
      size: {
        sm: "min-h-10 px-2.5 text-sm",
        md: "min-h-11 px-3",
        lg: "min-h-12 px-5 text-lg",
        icon: "size-11 p-0",
      },
    },
    defaultVariants: { variant: "secondary", size: "md" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean };

export function Button({
  className,
  variant,
  size,
  asChild,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  );
}
