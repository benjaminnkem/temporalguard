"use client";

import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-11 items-center justify-center gap-2 border px-4 font-mono text-xs font-medium tracking-[0.08em] uppercase transition-colors duration-100 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        primary:
          "border-primary bg-primary text-primary-foreground hover:border-primary-hover hover:bg-primary-hover",
        secondary:
          "border-border-strong bg-surface text-foreground hover:bg-foreground hover:text-background",
        ghost:
          "border-transparent bg-transparent text-muted-foreground hover:text-foreground hover:underline hover:underline-offset-4",
        destructive:
          "border-destructive bg-destructive text-white hover:bg-transparent hover:text-destructive",
      },
      size: {
        sm: "min-h-10 px-3 text-[11px]",
        md: "min-h-11 px-3",
        lg: "min-h-12 px-6 text-sm",
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
