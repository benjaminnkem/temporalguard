"use client";

import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowLeft,
  Check,
  Clock3,
  Copy,
  ExternalLink,
  FileText,
  Gauge,
  ScrollText,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { DataState } from "../../components/shared/data-state";
import { Button } from "../../components/ui/button";
import { Badge, Card } from "../../components/ui/surface";
import type { WorkflowObservabilityPreview } from "../../lib/contracts";
import {
  useWorkflow,
  useWorkflowLogs,
  useWorkflowMetrics,
  useWorkflowTraces,
} from "../../lib/queries";
import { formatDate } from "../../lib/utils";

export function WorkflowDetailView({ id }: { id: string }) {
  const searchParams = useSearchParams();
  const query = useWorkflow(id);
  const tracesQuery = useWorkflowTraces(id);
  const logsQuery = useWorkflowLogs(id);
  const metricsQuery = useWorkflowMetrics(id);
  const workflow = query.data;
  const signozBaseUrl = process.env.NEXT_PUBLIC_SIGNOZ_UI_URL?.replace(
    /\/$/,
    "",
  );
  const signozUrl =
    tracesQuery.data?.explorerUrl ??
    (signozBaseUrl
      ? workflow?.traceId
        ? `${signozBaseUrl}/trace/${encodeURIComponent(workflow.traceId)}`
        : signozBaseUrl
      : undefined);
  return (
    <DataState
      state={query.isLoading ? "loading" : query.isError ? "error" : "ready"}
      title="Workflow not available"
      onRetry={() => void query.refetch()}
    >
      {workflow ? (
        <div className="grid gap-5">
          <div>
            <Button
              nativeButton={false}
              variant="ghost"
              className="-ml-2 mb-3"
              render={<Link href={`/workflows?${searchParams.toString()}`} />}
            >
              <ArrowLeft className="size-4" /> Back to workflows
            </Button>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge
                    tone={
                      workflow.state === "violated"
                        ? "danger"
                        : workflow.state === "completed"
                          ? "success"
                          : "warning"
                    }
                  >
                    {workflow.state.replace("_", " ")}
                  </Badge>
                  <span className="font-mono text-xs text-muted-foreground">
                    {workflow.id}
                  </span>
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight">
                  {workflow.workflowType}
                </h1>
                <p className="mt-1 text-muted-foreground">
                  {workflow.ruleName}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() =>
                    void navigator.clipboard.writeText(location.href)
                  }
                >
                  <Copy className="size-4" /> Copy link
                </Button>
                {signozUrl ? (
                  <Button
                    render={
                      <a href={signozUrl} target="_blank" rel="noreferrer" />
                    }
                  >
                    <ExternalLink className="size-4" /> Open in SigNoz
                  </Button>
                ) : (
                  <Button disabled title="Configure NEXT_PUBLIC_SIGNOZ_UI_URL">
                    <ExternalLink className="size-4" /> Open in SigNoz
                  </Button>
                )}
              </div>
            </div>
          </div>
          <Card className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ["Entity", workflow.entityId],
              ["Started", formatDate(workflow.startedAt)],
              [
                workflow.completedAt ? "Completed" : "Deadline",
                formatDate(workflow.completedAt ?? workflow.deadlineAt ?? ""),
              ],
              ["Environment", workflow.environment],
              ["Deployment", workflow.deploymentVersion ?? "—"],
            ].map(([label, value]) => (
              <div key={label}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="mt-1 font-medium">{value}</p>
              </div>
            ))}
          </Card>
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.7fr)]">
            <Card className="p-5">
              <h2 className="font-semibold">Expected workflow</h2>
              <div className="relative mt-6 grid gap-6 pl-10">
                <div className="absolute top-2 bottom-2 left-[18px] w-px bg-border-strong" />
                {workflow.expectedSteps.map((step) => (
                  <div key={step.canonicalName} className="relative">
                    <span
                      className={`absolute top-0.5 -left-10 grid size-8 place-items-center rounded-full border-4 border-card ${
                        step.state === "completed"
                          ? "bg-success text-white"
                          : step.state === "missed" ||
                              step.state === "forbidden_seen"
                            ? "bg-destructive text-white"
                            : step.state === "current"
                              ? "bg-warning text-white"
                              : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {step.state === "completed" ? (
                        <Check className="size-3.5" />
                      ) : (
                        <Clock3 className="size-3.5" />
                      )}
                    </span>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{step.displayName}</p>
                        <p className="font-mono text-xs text-muted-foreground">
                          {step.canonicalName}
                        </p>
                      </div>
                      <Badge
                        tone={
                          step.state === "completed"
                            ? "success"
                            : step.state === "missed" ||
                                step.state === "forbidden_seen"
                              ? "danger"
                              : "warning"
                        }
                      >
                        {step.state.replace("_", " ")}
                      </Badge>
                    </div>
                    {step.occurredAt ? (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {formatDate(step.occurredAt)}
                      </p>
                    ) : null}
                  </div>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-semibold">Correlation</h2>
              <dl className="mt-4 grid gap-4 text-sm">
                <div>
                  <dt className="text-xs text-muted-foreground">Key</dt>
                  <dd className="font-mono">{workflow.correlationKey}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Value</dt>
                  <dd className="font-mono">{workflow.correlationValue}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">Operator</dt>
                  <dd>
                    <Badge tone="primary">{workflow.operator}</Badge>
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">
                    Trace reference
                  </dt>
                  <dd className="break-all font-mono text-xs">
                    {workflow.traceId ?? "Not available"}
                  </dd>
                </div>
              </dl>
            </Card>
          </div>
          <Card className="p-4">
            <Tabs.Root defaultValue="timeline">
              <Tabs.List className="flex gap-1 overflow-x-auto border-b border-border">
                {(
                  [
                    ["timeline", "Timeline", Clock3],
                    ["trace", "Trace preview", FileText],
                    ["logs", "Logs preview", ScrollText],
                    ["metrics", "Metrics preview", Gauge],
                    ["attributes", "Attributes", FileText],
                  ] as const
                ).map(([value, label, Icon]) => (
                  <Tabs.Trigger
                    key={value}
                    value={value}
                    className="flex min-h-10 items-center gap-2 border-b-2 border-transparent px-3 text-xs text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground"
                  >
                    <Icon className="size-3.5" />
                    {label}
                  </Tabs.Trigger>
                ))}
              </Tabs.List>
              <Tabs.Content value="timeline" className="pt-4">
                <div className="grid gap-2">
                  {workflow.events.map((event) => (
                    <div
                      key={event.id}
                      className="grid gap-2 rounded-[var(--radius-md)] bg-surface-subtle p-3 sm:grid-cols-[180px_1fr_auto]"
                    >
                      <span className="font-mono text-xs">
                        {formatDate(event.occurredAt)}
                      </span>
                      <span className="font-medium">{event.displayName}</span>
                      <span className="text-xs text-muted-foreground">
                        {event.serviceName}
                      </span>
                    </div>
                  ))}
                </div>
              </Tabs.Content>
              <Tabs.Content value="trace" className="pt-4">
                <ObservabilityPanel
                  label="traces"
                  query={tracesQuery}
                  fallbackUrl={signozUrl}
                />
              </Tabs.Content>
              <Tabs.Content value="logs" className="pt-4">
                <ObservabilityPanel
                  label="logs"
                  query={logsQuery}
                  fallbackUrl={signozBaseUrl}
                />
              </Tabs.Content>
              <Tabs.Content value="metrics" className="pt-4">
                <ObservabilityPanel
                  label="metrics"
                  query={metricsQuery}
                  fallbackUrl={signozBaseUrl}
                />
              </Tabs.Content>
              <Tabs.Content value="attributes" className="pt-4">
                <div className="grid gap-3">
                  {workflow.events.length > 0 ? (
                    workflow.events.map((event) => (
                      <div
                        key={event.id}
                        className="rounded-[var(--radius-md)] bg-surface-subtle p-4"
                      >
                        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <p className="font-medium">{event.displayName}</p>
                            <p className="font-mono text-xs text-muted-foreground">
                              {event.canonicalName}
                            </p>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(event.occurredAt)}
                          </span>
                        </div>
                        <pre className="overflow-x-auto font-mono text-xs">
                          {JSON.stringify(event.attributes, null, 2)}
                        </pre>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No event-log attributes are available.
                    </p>
                  )}
                  {Object.keys(workflow.attributes).length > 0 ? (
                    <div className="rounded-[var(--radius-md)] border border-border p-4">
                      <p className="mb-3 text-xs font-medium uppercase text-muted-foreground">
                        Workflow metadata
                      </p>
                      <pre className="overflow-x-auto font-mono text-xs">
                        {JSON.stringify(workflow.attributes, null, 2)}
                      </pre>
                    </div>
                  ) : null}
                </div>
              </Tabs.Content>
            </Tabs.Root>
          </Card>
        </div>
      ) : (
        <span />
      )}
    </DataState>
  );
}

type PreviewQuery = {
  data?: WorkflowObservabilityPreview;
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => Promise<unknown>;
};

function ObservabilityPanel({
  label,
  query,
  fallbackUrl,
}: {
  label: "traces" | "logs" | "metrics";
  query: PreviewQuery;
  fallbackUrl?: string;
}) {
  if (query.isLoading) {
    return (
      <p className="text-sm text-muted-foreground">
        Querying live SigNoz {label}…
      </p>
    );
  }
  if (query.isError) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-destructive">
          {query.error?.message ?? `Unable to load SigNoz ${label}.`}
        </p>
        <Button onClick={() => void query.refetch()}>Retry</Button>
      </div>
    );
  }
  const preview = query.data;
  if (!preview?.configured) {
    return (
      <p className="text-sm text-muted-foreground">
        {preview?.message ??
          "SigNoz live query access is not configured on the API server."}
      </p>
    );
  }
  if (preview.errorCode) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <p className="text-sm text-destructive">
          {preview.message ?? `Unable to query SigNoz ${label}.`}
        </p>
        <Button onClick={() => void query.refetch()}>Retry</Button>
      </div>
    );
  }
  const explorerUrl = preview.explorerUrl ?? fallbackUrl;
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">
          Live query · {formatDate(preview.start)} to {formatDate(preview.end)}
        </p>
        {explorerUrl ? (
          <Button
            variant="ghost"
            render={<a href={explorerUrl} target="_blank" rel="noreferrer" />}
          >
            <ExternalLink className="size-4" /> Open {label} in SigNoz
          </Button>
        ) : null}
      </div>
      {preview.items.length > 0 ? (
        preview.items.slice(0, 25).map((item, index) => (
          <pre
            key={`${label}-${index}`}
            className="overflow-x-auto rounded-[var(--radius-md)] bg-surface-subtle p-4 font-mono text-xs"
          >
            {JSON.stringify(item, null, 2)}
          </pre>
        ))
      ) : (
        <p className="text-sm text-muted-foreground">
          SigNoz returned no correlated {label} in this workflow&apos;s time
          range. New telemetry can take a short while to become queryable.
        </p>
      )}
    </div>
  );
}
