import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDuration(milliseconds: number) {
  if (milliseconds < 60_000) return `${Math.round(milliseconds / 1000)}s`;
  if (milliseconds < 3_600_000) return `${Math.round(milliseconds / 60_000)}m`;
  return `${(milliseconds / 3_600_000).toFixed(1)}h`;
}

export function formatDate(value: string) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
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
