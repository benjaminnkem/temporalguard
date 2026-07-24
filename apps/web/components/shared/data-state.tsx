import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";

export function DataState({
  state,
  title,
  description,
  onRetry,
  children,
}: {
  state: "ready" | "loading" | "empty" | "filtered-empty" | "error";
  title?: string;
  description?: string;
  onRetry?: () => void;
  children: React.ReactNode;
}) {
  if (state === "loading") {
    return (
      <div className="grid gap-3" aria-label="Loading data">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-56 w-full" />
      </div>
    );
  }

  if (state === "error") {
    return (
      <Empty className="min-h-56 border border-border-strong border-solid">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <AlertTriangle className="text-destructive" />
          </EmptyMedia>
          <EmptyTitle>{title ?? "Unable to load"}</EmptyTitle>
          <EmptyDescription>
            {description ?? "Something went wrong while loading this data."}
          </EmptyDescription>
        </EmptyHeader>
        {onRetry ? (
          <Button onClick={onRetry} variant="outline">
            <RefreshCw className="size-4" /> Retry
          </Button>
        ) : null}
      </Empty>
    );
  }

  if (state === "empty" || state === "filtered-empty") {
    return (
      <Empty className="min-h-56 border border-border-strong border-dashed">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Inbox className="text-muted-foreground" />
          </EmptyMedia>
          <EmptyTitle>
            {title ??
              (state === "filtered-empty"
                ? "No matching results"
                : "No data yet")}
          </EmptyTitle>
          <EmptyDescription>
            {description ??
              (state === "filtered-empty"
                ? "Adjust or clear filters to widen the result set."
                : "Data will appear here as workflows are observed.")}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return <>{children}</>;
}
