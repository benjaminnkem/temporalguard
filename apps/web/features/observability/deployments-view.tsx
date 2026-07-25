"use client";

import { Box } from "lucide-react";
import { Badge, Card } from "@/components/ui/surface";
import { useDeployments } from "@/lib/observability-queries";
import { PageIntro, QueryBoundary } from "./shared";
import { formatDate } from "@/lib/utils";

export function DeploymentsView() {
  const query = useDeployments();
  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="Change intelligence"
        title="Deployments"
        description="Service versions observed in telemetry and available for before/after impact comparisons."
      />
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        hasData={Boolean(query.data)}
        empty={!query.isPending && !query.data?.length}
        retry={() => void query.refetch()}
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {(query.data ?? []).map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <Box className="size-5 text-primary" />
                <Badge>{item.environment}</Badge>
              </div>
              <h2 className="mt-4 font-semibold">{item.serviceName}</h2>
              <p className="mt-1 font-mono text-sm">{item.version}</p>
              <dl className="mt-4 grid gap-2 text-xs text-muted-foreground">
                <div className="flex justify-between gap-3">
                  <dt>First observed</dt>
                  <dd>{formatDate(item.firstObservedAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Last observed</dt>
                  <dd>{formatDate(item.lastObservedAt)}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt>Source</dt>
                  <dd>{item.source}</dd>
                </div>
              </dl>
            </Card>
          ))}
        </div>
      </QueryBoundary>
    </div>
  );
}
