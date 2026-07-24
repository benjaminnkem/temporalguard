import { clsx, type ClassValue } from "clsx";
import { format, isValid, parseISO } from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(milliseconds: number) {
  if (milliseconds < 60_000) return `${Math.round(milliseconds / 1000)}s`;
  if (milliseconds < 3_600_000) return `${Math.round(milliseconds / 60_000)}m`;
  return `${(milliseconds / 3_600_000).toFixed(1)}h`;
}

function toDate(value: string | number | Date) {
  if (value instanceof Date) return value;
  if (typeof value === "number") return new Date(value);
  const parsed = parseISO(value);
  if (isValid(parsed)) return parsed;
  const fallback = new Date(value);
  return isValid(fallback) ? fallback : null;
}

export function formatDate(value: string) {
  if (!value) return "—";
  const date = toDate(value);
  if (!date) return value;
  return format(date, "MMM d, yyyy · h:mm a");
}

export function formatChartAxisDate(value: string | number | Date) {
  const date = toDate(value);
  if (!date) return String(value);
  return format(date, "MMM d · h a");
}

export function formatChartTooltipDate(value: string | number | Date) {
  const date = toDate(value);
  if (!date) return String(value);
  return format(date, "EEE, MMM d · h:mm a");
}

export function statusVariant(
  tone:
    | "neutral"
    | "success"
    | "warning"
    | "danger"
    | "info"
    | "primary"
    | "critical"
    | "completed"
    | "recovered"
    | "violated"
    | "near_deadline"
    | "waiting"
    | "running"
    | "active"
    | "paused"
    | "draft"
    | string,
):
  | "default"
  | "secondary"
  | "destructive"
  | "outline"
  | "success"
  | "warning"
  | "info" {
  switch (tone) {
    case "success":
    case "completed":
    case "recovered":
    case "active":
      return "success";
    case "warning":
    case "near_deadline":
    case "waiting":
    case "running":
      return "warning";
    case "danger":
    case "critical":
    case "violated":
      return "destructive";
    case "info":
    case "primary":
      return "info";
    case "paused":
    case "draft":
    case "neutral":
    default:
      return "secondary";
  }
}
