import { AlertTriangle, Inbox, RefreshCw } from "lucide-react";
import { Button } from "../ui/button";
import { Card, Skeleton } from "../ui/surface";

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
      <Card className="grid min-h-56 place-items-center p-6 text-center">
        <div className="grid max-w-md justify-items-center gap-3">
          <AlertTriangle className="size-6 text-destructive" />
          <h2 className="text-lg font-semibold">{title ?? "Unable to load"}</h2>
          <p className="text-muted-foreground">
            {description ?? "Something went wrong while loading this data."}
          </p>
          {onRetry ? (
            <Button onClick={onRetry}>
              <RefreshCw className="size-4" /> Retry
            </Button>
          ) : null}
        </div>
      </Card>
    );
  }

  if (state === "empty" || state === "filtered-empty") {
    return (
      <Card className="grid min-h-56 place-items-center p-6 text-center">
        <div className="grid max-w-md justify-items-center gap-3">
          <Inbox className="size-6 text-muted-foreground" />
          <h2 className="text-lg font-semibold">
            {title ??
              (state === "filtered-empty"
                ? "No matching results"
                : "No data yet")}
          </h2>
          <p className="text-muted-foreground">
            {description ??
              (state === "filtered-empty"
                ? "Adjust or clear filters to widen the result set."
                : "Data will appear here as workflows are observed.")}
          </p>
        </div>
      </Card>
    );
  }

  return <>{children}</>;
}
