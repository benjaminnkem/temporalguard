/**
 * Compatibility layer for legacy imports.
 * Prefer importing from @/components/ui/{card,badge,skeleton} directly.
 */
export {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "./card";
export { Skeleton } from "./skeleton";

import { Badge as UiBadge, type badgeVariants } from "./badge";
import { statusVariant } from "@/lib/utils";
import type { VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/** Legacy Badge with `tone` support used across feature views. */
export function Badge({
  children,
  tone = "neutral",
  variant,
  className,
}: {
  children: React.ReactNode;
  tone?:
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "primary"
    | string;
  variant?: BadgeVariant;
  className?: string;
}) {
  return (
    <UiBadge
      variant={variant ?? statusVariant(tone)}
      className={cn(className)}
    >
      {children}
    </UiBadge>
  );
}
