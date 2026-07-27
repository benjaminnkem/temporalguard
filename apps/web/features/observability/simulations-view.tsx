"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Card } from "@/components/ui/surface";
import {
  useCreateSimulation,
  useSimulations,
} from "@/lib/observability-queries";
import { PageIntro, QueryBoundary, percent } from "./shared";
import { formatDate } from "@/lib/utils";

export function SimulationsView() {
  const query = useSimulations();
  const create = useCreateSimulation();
  const now = new Date();
  const [from, setFrom] = useState(
    new Date(now.getTime() - 7 * 86_400_000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(now.toISOString().slice(0, 10));
  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="Historical replay"
        title="Rule simulations"
        description="Evaluate a bounded historical window against persisted outcomes. Simulation never changes a rule, workflow, or violation."
        actions={
          <div className="flex flex-wrap gap-2">
            <Input
              aria-label="Simulation start"
              type="date"
              value={from}
              onChange={(event) => setFrom(event.target.value)}
            />
            <Input
              aria-label="Simulation end"
              type="date"
              value={to}
              onChange={(event) => setTo(event.target.value)}
            />
            <Button
              disabled={create.isPending}
              onClick={() =>
                create.mutate({
                  from: new Date(`${from}T00:00:00Z`).toISOString(),
                  to: new Date(`${to}T23:59:59Z`).toISOString(),
                  draft: { source: "current_rules", version: 1 },
                })
              }
            >
              Run simulation
            </Button>
          </div>
        }
      />
      {create.error ? (
        <p role="alert" className="text-sm text-destructive">
          {create.error.message}
        </p>
      ) : null}
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        hasData={Boolean(query.data)}
        empty={!query.isPending && !query.data?.length}
        retry={() => void query.refetch()}
      >
        <div className="grid gap-4 md:grid-cols-2">
          {(query.data ?? []).map((item) => (
            <Card key={item.id} className="p-5">
              <div className="flex items-center justify-between">
                <Badge>{item.status}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(item.createdAt)}
                </span>
              </div>
              <p className="mt-4 text-3xl font-semibold">
                {item.workflowsEvaluated}
              </p>
              <p className="text-sm text-muted-foreground">
                workflows evaluated
              </p>
              <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Complete</dt>
                  <dd className="font-semibold">{item.wouldComplete}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Late</dt>
                  <dd className="font-semibold">{item.wouldCompleteLate}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Violate</dt>
                  <dd className="font-semibold">{item.wouldViolate}</dd>
                </div>
              </dl>
              <p className="mt-4 text-xs text-muted-foreground">
                Completion rate:{" "}
                {percent(Number(item.result?.completionRate ?? 0))}
              </p>
            </Card>
          ))}
        </div>
      </QueryBoundary>
    </div>
  );
}
