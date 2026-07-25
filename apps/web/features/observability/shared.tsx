"use client";

import { AlertTriangle, CloudOff, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/surface";
import { Skeleton } from "@/components/ui/skeleton";

export function PageIntro({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">
          {eyebrow}
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight sm:text-3xl">
          {title}
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          {description}
        </p>
      </div>
      {actions}
    </header>
  );
}

export function QueryBoundary({
  pending,
  error,
  hasData,
  empty,
  retry,
  children,
}: {
  pending: boolean;
  error: Error | null;
  hasData?: boolean;
  empty?: boolean;
  retry: () => void;
  children: React.ReactNode;
}) {
  if (pending) {
    return (
      <div className="grid gap-3" aria-label="Loading">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }
  if (error && !hasData) {
    return (
      <Card className="grid min-h-56 place-items-center p-6 text-center">
        <div>
          <AlertTriangle className="mx-auto size-6 text-destructive" />
          <h2 className="mt-3 font-semibold">Unable to load this view</h2>
          <p className="mt-1 text-sm text-muted-foreground">{error.message}</p>
          <Button className="mt-4" variant="outline" onClick={retry}>
            <RefreshCw className="size-4" /> Retry
          </Button>
        </div>
      </Card>
    );
  }
  if (empty) {
    return (
      <Card className="grid min-h-56 place-items-center border-dashed p-6 text-center">
        <div>
          <h2 className="font-semibold">No records yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Real telemetry-backed records will appear here when available.
          </p>
        </div>
      </Card>
    );
  }
  return (
    <>
      {error ? (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 border border-warning bg-warning-subtle p-3 text-sm text-warning"
        >
          <AlertTriangle className="size-4" />
          Showing cached data; refresh failed: {error.message}
        </div>
      ) : null}
      {children}
    </>
  );
}

export function ConnectivityNotice() {
  const [online, setOnline] = useState(true);
  useEffect(() => {
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center gap-2 bg-warning-subtle p-3 text-sm text-warning"
    >
      <CloudOff className="size-4" />
      Offline. Cached data remains visible and requests resume on reconnect.
    </div>
  );
}

export const percent = (value: number) =>
  new Intl.NumberFormat(undefined, {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
