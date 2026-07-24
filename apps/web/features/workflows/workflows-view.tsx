"use client";

import {
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Columns3,
  Pause,
  Play,
  Radio,
  Search,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { DataState } from "../../components/shared/data-state";
import { PageHeader } from "../../components/shared/page-header";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Badge, Card } from "../../components/ui/surface";
import { useWorkflows } from "../../lib/queries";
import { formatDate } from "../../lib/utils";
import { useUiStore } from "../../stores/ui-store";

const tabs = [
  "all",
  "waiting",
  "near_deadline",
  "violated",
  "completed",
] as const;

function toneForState(state: string) {
  if (state === "completed" || state === "recovered") return "success" as const;
  if (state === "violated") return "danger" as const;
  if (state === "near_deadline") return "warning" as const;
  return "info" as const;
}

export function WorkflowsView({ live = false }: { live?: boolean }) {
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<(typeof tabs)[number]>("all");
  const [search, setSearch] = useState("");
  const [columnsOpen, setColumnsOpen] = useState(false);
  const livePaused = useUiStore((state) => state.livePaused);
  const toggleLive = useUiStore((state) => state.toggleLive);
  const environment = searchParams.get("environment") ?? "production";
  const query = useWorkflows({
    environment,
    search,
    state:
      searchParams.get("state") === "error"
        ? "error"
        : livePaused
          ? "paused"
          : tab,
  });
  const dataState = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : query.data?.items.length === 0
        ? search || tab !== "all"
          ? "filtered-empty"
          : "empty"
        : "ready";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow={live ? "Streaming view" : "Workflow explorer"}
        title={live ? "Live workflows" : "Workflows"}
        description={
          live
            ? "Background refresh highlights workflows approaching or crossing their deadline."
            : "Search, filter, and inspect workflow instances while preserving analytical context."
        }
        actions={
          live ? (
            <Button
              onClick={toggleLive}
              variant={livePaused ? "secondary" : "primary"}
            >
              {livePaused ? (
                <Play className="size-4" />
              ) : (
                <Pause className="size-4" />
              )}
              {livePaused ? "Resume updates" : "Pause updates"}
            </Button>
          ) : null
        }
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-3 sm:p-4 xl:flex-row xl:items-center">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map((item) => (
              <button
                type="button"
                key={item}
                onClick={() => setTab(item)}
                className={`rounded-[var(--radius-md)] px-3 py-2 text-xs font-medium whitespace-nowrap ${
                  tab === item
                    ? "bg-primary-subtle text-primary-subtle-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                {item.replace("_", " ")}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 gap-2 xl:justify-end">
            <div className="relative min-w-0 flex-1 xl:max-w-sm">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-9"
                placeholder="Workflow, event, rule, service, entity…"
              />
            </div>
            <Button
              size="icon"
              aria-label="Configure columns"
              aria-pressed={columnsOpen}
              onClick={() => setColumnsOpen((value) => !value)}
            >
              <Columns3 className="size-4" />
            </Button>
            <Button size="icon" aria-label="Sort by urgency">
              <ArrowUpDown className="size-4" />
            </Button>
          </div>
        </div>
        {columnsOpen ? (
          <div className="flex flex-wrap gap-3 border-b border-border bg-surface-subtle px-4 py-3 text-xs">
            {["Rule", "Service", "Deployment", "Deadline", "Last event"].map(
              (column) => (
                <label key={column} className="flex items-center gap-1.5">
                  <input type="checkbox" defaultChecked />
                  {column}
                </label>
              ),
            )}
          </div>
        ) : null}
        {live ? (
          <div className="flex items-center gap-2 border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <Radio className={`size-3.5 ${livePaused ? "" : "text-success"}`} />
            {livePaused
              ? "Updates paused; existing data remains visible."
              : "Mock stream active · next refresh in approximately 12 seconds"}
          </div>
        ) : null}
        <div className="p-3 sm:p-4">
          <DataState
            state={dataState}
            onRetry={() => void query.refetch()}
            title={
              dataState === "filtered-empty"
                ? "No workflows match these filters"
                : undefined
            }
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="px-3 py-3 font-medium">State</th>
                    <th className="px-3 py-3 font-medium">Workflow</th>
                    <th className="px-3 py-3 font-medium">Rule</th>
                    <th className="px-3 py-3 font-medium">Last event</th>
                    <th className="px-3 py-3 font-medium">Service</th>
                    <th className="px-3 py-3 font-medium">Deadline</th>
                    <th className="px-3 py-3 font-medium">Deployment</th>
                    <th className="w-10" />
                  </tr>
                </thead>
                <tbody>
                  {query.data?.items.map((workflow) => (
                    <tr
                      key={workflow.id}
                      className="border-b border-border transition-colors hover:bg-surface-subtle"
                    >
                      <td className="px-3 py-3">
                        <Badge tone={toneForState(workflow.state)}>
                          {workflow.state.replace("_", " ")}
                        </Badge>
                      </td>
                      <td className="px-3 py-3">
                        <Link
                          href={`/workflows/${workflow.id}?${searchParams.toString()}`}
                          className="font-medium hover:text-primary"
                        >
                          {workflow.workflowType}
                        </Link>
                        <p className="font-mono text-[10px] text-muted-foreground">
                          {workflow.id} · {workflow.entityId}
                        </p>
                      </td>
                      <td className="px-3 py-3">{workflow.ruleName}</td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {workflow.lastEventName}
                      </td>
                      <td className="px-3 py-3">
                        {workflow.serviceName ?? "—"}
                      </td>
                      <td className="px-3 py-3 text-xs tabular-nums">
                        {workflow.completedAt ? (
                          <span className="inline-flex items-center gap-1 text-success">
                            <CheckCircle2 className="size-3.5" />
                            {formatDate(workflow.completedAt)}
                          </span>
                        ) : workflow.deadlineAt ? (
                          <span className="inline-flex items-center gap-1">
                            <Clock3 className="size-3.5" />
                            {formatDate(workflow.deadlineAt)}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-3 py-3 font-mono text-xs">
                        {workflow.deploymentVersion}
                      </td>
                      <td>
                        <Button size="icon" variant="ghost" asChild>
                          <Link
                            href={`/workflows/${workflow.id}?${searchParams.toString()}`}
                            aria-label={`Open ${workflow.id}`}
                          >
                            <ChevronRight className="size-4" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </DataState>
        </div>
        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>{query.data?.total ?? 0} results · cursor pagination</span>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              disabled
              aria-label="Previous page"
            >
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              disabled={!query.data?.nextCursor}
              aria-label="Next page"
            >
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
