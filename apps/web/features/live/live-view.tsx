"use client";

import { formatDistanceToNowStrict, isValid, parseISO } from "date-fns";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Pause,
  Play,
  Radio,
  RefreshCw,
  Search,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Spinner } from "@/components/ui/spinner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkflowState, WorkflowSummary } from "@/lib/contracts";
import { useWorkflows } from "@/lib/queries";
import { cn, formatDate, statusVariant } from "@/lib/utils";
import { useUiStore } from "@/stores/ui-store";

const REFRESH_MS = 8_000;

const filters = [
  { value: "attention", label: "Needs attention" },
  { value: "all", label: "All open" },
  { value: "near_deadline", label: "Near deadline" },
  { value: "violated", label: "Violated" },
  { value: "waiting", label: "Waiting" },
  { value: "completed", label: "Completed" },
] as const;

type FilterValue = (typeof filters)[number]["value"];

const statePriority: Record<WorkflowState, number> = {
  violated: 0,
  near_deadline: 1,
  waiting: 2,
  recovered: 3,
  completed: 4,
};

function parseDate(value?: string) {
  if (!value) return null;
  const date = parseISO(value);
  return isValid(date) ? date : null;
}

function relativeTime(value?: string) {
  const date = parseDate(value);
  if (!date) return "—";
  return formatDistanceToNowStrict(date, { addSuffix: true });
}

function remainingLabel(workflow: WorkflowSummary) {
  if (workflow.completedAt) return "Completed";
  const deadline = parseDate(workflow.deadlineAt);
  if (!deadline) return "No deadline";
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return "Overdue";
  return formatDistanceToNowStrict(deadline, { addSuffix: false }) + " left";
}

function remainingTone(workflow: WorkflowSummary) {
  if (workflow.state === "violated") return "text-destructive";
  if (workflow.completedAt) return "text-success";
  const deadline = parseDate(workflow.deadlineAt);
  if (!deadline) return "text-muted-foreground";
  const ms = deadline.getTime() - Date.now();
  if (ms <= 0) return "text-destructive";
  if (ms < 15 * 60_000) return "text-warning";
  return "text-muted-foreground";
}

function sortByUrgency(items: WorkflowSummary[]) {
  return [...items].sort((left, right) => {
    const stateDiff =
      (statePriority[left.state] ?? 99) - (statePriority[right.state] ?? 99);
    if (stateDiff !== 0) return stateDiff;
    const leftDeadline =
      parseDate(left.deadlineAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    const rightDeadline =
      parseDate(right.deadlineAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
    return leftDeadline - rightDeadline;
  });
}

function LiveStatCard({
  label,
  value,
  hint,
  active,
  tone = "default",
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  active?: boolean;
  tone?: "default" | "warning" | "danger" | "success";
  onClick?: () => void;
}) {
  const toneClass =
    tone === "danger"
      ? "text-destructive"
      : tone === "warning"
        ? "text-warning"
        : tone === "success"
          ? "text-success"
          : "text-foreground";

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-2xl text-left transition-colors outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
        active && "ring-2 ring-primary/40",
      )}
    >
      <Card
        size="sm"
        className={cn(
          "h-full gap-2 py-4 transition-colors hover:bg-muted/30",
          active && "bg-muted/40",
        )}
      >
        <CardHeader className="px-4 pb-0">
          <CardDescription className="text-xs font-medium">
            {label}
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4">
          <p className={cn("text-2xl font-semibold tabular-nums", toneClass)}>
            {value}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        </CardContent>
      </Card>
    </button>
  );
}

export function LiveView() {
  const searchParams = useSearchParams();
  const [filter, setFilter] = useState<FilterValue>("attention");
  const [search, setSearch] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(REFRESH_MS / 1000);
  const livePaused = useUiStore((state) => state.livePaused);
  const toggleLive = useUiStore((state) => state.toggleLive);
  const environment = searchParams.get("environment") ?? "production";

  const queryState =
    filter === "attention" || filter === "all" ? "all" : filter;

  const query = useWorkflows(
    {
      environment,
      search,
      state: queryState,
    },
    { refetchInterval: livePaused ? false : REFRESH_MS },
  );

  const items = useMemo(() => {
    const source = query.data?.items ?? [];
    const filtered =
      filter === "attention"
        ? source.filter(
            (item) =>
              item.state === "near_deadline" || item.state === "violated",
          )
        : filter === "all"
          ? source.filter((item) => item.state !== "completed")
          : source;
    return sortByUrgency(filtered);
  }, [filter, query.data?.items]);

  const counts = useMemo(() => {
    const source = query.data?.items ?? [];
    return {
      open: source.filter((item) => item.state !== "completed").length,
      near: source.filter((item) => item.state === "near_deadline").length,
      violated: source.filter((item) => item.state === "violated").length,
      waiting: source.filter((item) => item.state === "waiting").length,
      completed: source.filter((item) => item.state === "completed").length,
    };
  }, [query.data?.items]);

  const attentionItems = useMemo(
    () =>
      sortByUrgency(
        (query.data?.items ?? []).filter(
          (item) => item.state === "near_deadline" || item.state === "violated",
        ),
      ).slice(0, 4),
    [query.data?.items],
  );

  useEffect(() => {
    if (livePaused) {
      setSecondsLeft(REFRESH_MS / 1000);
      return;
    }
    setSecondsLeft(REFRESH_MS / 1000);
    const timer = window.setInterval(() => {
      setSecondsLeft((value) => (value <= 1 ? REFRESH_MS / 1000 : value - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [livePaused, query.dataUpdatedAt]);

  const dataState = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : items.length === 0
        ? search || filter !== "all"
          ? "filtered-empty"
          : "empty"
        : "ready";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Streaming view"
        title="Live workflows"
        description="Watch open workflows as they approach deadlines. Pause the stream when you need a stable investigation surface."
        actions={
          <div className="flex items-center gap-2">
            {query.isFetching && !query.isLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner className="size-3" />
                Syncing
              </span>
            ) : null}
            <Button
              variant={livePaused ? "default" : "outline"}
              size="sm"
              onClick={toggleLive}
              aria-pressed={!livePaused}
            >
              {livePaused ? <Play /> : <Pause />}
              {livePaused ? "Resume stream" : "Pause stream"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={cn(query.isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        }
      />

      <Card className="gap-0 py-0">
        <CardContent className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "grid size-9 place-items-center rounded-xl",
                livePaused
                  ? "bg-muted text-muted-foreground"
                  : "bg-success-subtle text-success",
              )}
            >
              <Radio className={cn("size-4", !livePaused && "live-dot")} />
            </span>
            <div>
              <p className="text-sm font-medium">
                {livePaused ? "Stream paused" : "Live stream connected"}
              </p>
              <p className="text-xs text-muted-foreground">
                {livePaused
                  ? "Existing rows stay visible until you resume."
                  : `Auto-refresh in ${secondsLeft}s · last update ${
                      query.dataUpdatedAt
                        ? formatDistanceToNowStrict(query.dataUpdatedAt, {
                            addSuffix: true,
                          })
                        : "just now"
                    }`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={livePaused ? "secondary" : "success"}>
              <Activity className="size-3" />
              {livePaused ? "Paused" : "Live"}
            </Badge>
            <Badge variant="outline">{environment}</Badge>
            <Badge variant="outline">
              {query.data?.total ?? 0} workflows in scope
            </Badge>
          </div>
        </CardContent>
      </Card>

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Live summary"
      >
        <LiveStatCard
          label="Open"
          value={counts.open}
          hint="Active evaluation windows"
          active={filter === "all"}
          onClick={() => setFilter("all")}
        />
        <LiveStatCard
          label="Near deadline"
          value={counts.near}
          hint="Less than 15 minutes remaining"
          tone="warning"
          active={filter === "near_deadline"}
          onClick={() => setFilter("near_deadline")}
        />
        <LiveStatCard
          label="Violated"
          value={counts.violated}
          hint="Missed promises right now"
          tone="danger"
          active={filter === "violated"}
          onClick={() => setFilter("violated")}
        />
        <LiveStatCard
          label="Waiting"
          value={counts.waiting}
          hint="Healthy open workflows"
          tone="success"
          active={filter === "waiting"}
          onClick={() => setFilter("waiting")}
        />
      </section>

      {attentionItems.length > 0 ? (
        <section className="grid gap-3 lg:grid-cols-2 xl:grid-cols-4">
          {attentionItems.map((workflow) => (
            <Card
              key={workflow.id}
              size="sm"
              className={cn(
                "gap-3 py-4",
                workflow.state === "violated" && "ring-1 ring-destructive/25",
                workflow.state === "near_deadline" && "ring-1 ring-warning/25",
              )}
            >
              <CardHeader className="px-4">
                <div className="flex items-start justify-between gap-2">
                  <Badge
                    variant={statusVariant(workflow.state)}
                    className="capitalize"
                  >
                    {workflow.state.replaceAll("_", " ")}
                  </Badge>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 text-xs font-medium",
                      remainingTone(workflow),
                    )}
                  >
                    <Timer className="size-3.5" />
                    {remainingLabel(workflow)}
                  </span>
                </div>
                <CardTitle className="text-sm leading-snug">
                  <Link
                    href={`/workflows/${workflow.id}?${searchParams.toString()}`}
                    className="hover:text-primary"
                  >
                    {workflow.workflowType}
                  </Link>
                </CardTitle>
                <CardDescription className="font-mono text-[11px]">
                  {workflow.id}
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-2 px-4 text-xs text-muted-foreground">
                <p className="truncate">{workflow.ruleName}</p>
                <p className="truncate font-mono">
                  {workflow.lastEventName ?? "No recent event"}
                </p>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span>{workflow.serviceName ?? "Unknown service"}</span>
                  <Button
                    size="xs"
                    variant="ghost"
                    render={
                      <Link
                        href={`/workflows/${workflow.id}?${searchParams.toString()}`}
                      />
                    }
                  >
                    Open
                    <ChevronRight />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </section>
      ) : null}

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-4 border-b py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <Tabs
              value={filter}
              onValueChange={(value) => {
                if (filters.some((item) => item.value === value)) {
                  setFilter(value as FilterValue);
                }
              }}
            >
              <TabsList className="h-auto w-full flex-wrap justify-start xl:w-auto">
                {filters.map((item) => (
                  <TabsTrigger
                    key={item.value}
                    value={item.value}
                    className="px-2.5 text-xs sm:text-sm"
                  >
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <InputGroup className="w-full xl:max-w-sm">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search workflow, rule, service, entity…"
              />
            </InputGroup>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <DataState
            state={dataState}
            onRetry={() => void query.refetch()}
            title={
              dataState === "filtered-empty"
                ? "No workflows match this live filter"
                : "No live workflows yet"
            }
            description={
              dataState === "filtered-empty"
                ? "Try another state tab or clear the search."
                : "New workflow instances will appear here as events stream in."
            }
          >
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>State</TableHead>
                  <TableHead>Workflow</TableHead>
                  <TableHead>Rule</TableHead>
                  <TableHead>Last event</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Remaining</TableHead>
                  <TableHead>Started</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((workflow) => (
                  <TableRow
                    key={workflow.id}
                    className={cn(
                      workflow.state === "violated" && "bg-destructive/5",
                      workflow.state === "near_deadline" && "bg-warning/5",
                    )}
                  >
                    <TableCell>
                      <Badge
                        variant={statusVariant(workflow.state)}
                        className="capitalize"
                      >
                        {workflow.state.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell className="max-w-[220px] whitespace-normal">
                      <Link
                        href={`/workflows/${workflow.id}?${searchParams.toString()}`}
                        className="font-medium hover:text-primary"
                      >
                        {workflow.workflowType}
                      </Link>
                      <p className="mt-0.5 font-mono text-[11px] text-muted-foreground">
                        {workflow.id} · {workflow.entityId}
                      </p>
                    </TableCell>
                    <TableCell className="max-w-[180px] truncate">
                      {workflow.ruleName}
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {workflow.lastEventName ?? "—"}
                    </TableCell>
                    <TableCell>{workflow.serviceName ?? "—"}</TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs font-medium tabular-nums",
                          remainingTone(workflow),
                        )}
                      >
                        {workflow.completedAt ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : workflow.state === "violated" ? (
                          <AlertTriangle className="size-3.5" />
                        ) : (
                          <Clock3 className="size-3.5" />
                        )}
                        {remainingLabel(workflow)}
                      </span>
                      {workflow.deadlineAt ? (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">
                          {formatDate(workflow.deadlineAt)}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {relativeTime(workflow.startedAt)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon-sm"
                        variant="ghost"
                        render={
                          <Link
                            href={`/workflows/${workflow.id}?${searchParams.toString()}`}
                            aria-label={`Open ${workflow.id}`}
                          />
                        }
                      >
                        <ChevronRight />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </DataState>
        </CardContent>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {items.length} of {query.data?.total ?? 0} · sorted by
            urgency
          </span>
          <span>
            {livePaused
              ? "Refresh paused"
              : `Streaming every ${REFRESH_MS / 1000}s`}
          </span>
        </div>
      </Card>
    </div>
  );
}
