"use client";

import {
  AlertTriangle,
  ArrowLeft,
  Box,
  Clock3,
  ExternalLink,
  FileSearch,
  Link2,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DataState } from "../../components/shared/data-state";
import { Button } from "../../components/ui/button";
import { Badge, Card } from "../../components/ui/surface";
import { useViolation } from "../../lib/queries";
import { formatDate, formatDuration } from "../../lib/utils";

export function ViolationDetailView({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const query = useViolation(id);
  const violation = query.data;
  return (
    <DataState
      state={query.isLoading ? "loading" : query.isError ? "error" : "ready"}
      title="Violation not available"
      onRetry={() => void query.refetch()}
    >
      {violation ? (
        <div className="grid gap-5">
          <div>
            <Button
              variant="ghost"
              className="-ml-2 mb-3"
              render={<Link href={`/violations?${searchParams.toString()}`} />}
            >
              <ArrowLeft className="size-4" /> Back to violations
            </Button>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      violation.severity === "critical" ? "danger" : "warning"
                    }
                  >
                    {violation.severity}
                  </Badge>
                  <Badge>{violation.status}</Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {violation.id}
                  </span>
                </div>
                <h1 className="mt-3 max-w-4xl text-2xl font-semibold tracking-tight">
                  {violation.explanation}
                </h1>
                <p className="mt-2 text-muted-foreground">
                  {violation.ruleName} · {formatDate(violation.occurredAt)}
                </p>
              </div>
              <Button disabled>
                <ExternalLink className="size-4" /> Open correlated evidence
              </Button>
            </div>
          </div>
          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="p-5 lg:col-span-2">
              <h2 className="font-semibold">What happened</h2>
              <div className="mt-5 grid gap-4">
                <div className="grid gap-3 rounded-[var(--radius-lg)] bg-surface-subtle p-4 sm:grid-cols-[140px_1fr]">
                  <span className="text-xs font-medium text-muted-foreground">
                    Trigger
                  </span>
                  <span className="font-mono text-sm">
                    {violation.triggerEventName}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Expected condition
                  </span>
                  <span>{violation.expectedCondition}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Observed
                  </span>
                  <span>{violation.observedCondition}</span>
                  <span className="text-xs font-medium text-muted-foreground">
                    Last event
                  </span>
                  <span className="font-mono text-sm">
                    {violation.lastObservedEventName}
                  </span>
                </div>
                {violation.overdueMs ? (
                  <div className="flex items-center gap-3 rounded-[var(--radius-md)] bg-destructive-subtle p-4 text-destructive">
                    <Clock3 className="size-5" />
                    <div>
                      <p className="font-semibold">
                        {formatDuration(violation.overdueMs)} overdue
                      </p>
                      <p className="text-xs">
                        Measured from the configured deadline to the selected
                        time boundary.
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-semibold">Correlation</h2>
              <dl className="mt-4 grid gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Key</dt>
                  <dd className="font-mono">{violation.correlationKey}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Value</dt>
                  <dd className="font-mono">{violation.correlationValue}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Workflow</dt>
                  <dd>
                    <Link
                      href={`/workflows/${violation.workflowId}?${searchParams.toString()}`}
                      className="inline-flex items-center gap-1 font-mono text-primary"
                    >
                      {violation.workflowId} <Link2 className="size-3" />
                    </Link>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Environment</dt>
                  <dd>{violation.environment}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Deployment</dt>
                  <dd className="font-mono text-xs">
                    {violation.deploymentVersion}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
          <Card className="p-5">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-0.5 size-5 text-warning" />
              <div>
                <h2 className="font-semibold">Supporting technical evidence</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Evidence is temporally or contextually correlated. It does not
                  prove root causation.
                </p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {violation.relatedEvidence.length > 0 ? (
                violation.relatedEvidence.map((evidence) => (
                  <div
                    key={evidence.title}
                    className="rounded-[var(--radius-lg)] border border-border bg-surface-subtle p-4"
                  >
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-2 text-xs font-medium uppercase">
                        {evidence.kind === "deployment" ? (
                          <Box className="size-3.5" />
                        ) : (
                          <FileSearch className="size-3.5" />
                        )}
                        {evidence.kind}
                      </span>
                      {evidence.confidence ? (
                        <Badge>{evidence.confidence} confidence</Badge>
                      ) : null}
                    </div>
                    <h3 className="mt-3 font-semibold">{evidence.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {evidence.description}
                    </p>
                    {evidence.reference ? (
                      <p className="mt-3 break-all font-mono text-[10px]">
                        {evidence.reference}
                      </p>
                    ) : null}
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No correlated technical evidence is available for this
                  violation.
                </p>
              )}
            </div>
          </Card>
          <Card className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Similar violations</h2>
              <p className="text-sm text-muted-foreground">
                7 records share this rule and deployment context.
              </p>
            </div>
            <Button
              render={
                <Link
                  href={`/violations?rule=${violation.ruleId}&deployment=${encodeURIComponent(
                    violation.deploymentVersion ?? "",
                  )}&${searchParams.toString()}`}
                />
              }
            >
              View affected cohort
            </Button>
          </Card>
        </div>
      ) : (
        <span />
      )}
    </DataState>
  );
}
