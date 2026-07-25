"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Search,
  Timer,
} from "lucide-react";
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
import { DataTable } from "@/components/ui/data-table";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { WorkflowState } from "@/lib/contracts";
import { useWorkflows } from "@/lib/queries";
import { cn } from "@/lib/utils";
import { getWorkflowColumns } from "./columns";

const tabs = [
  { value: "all", label: "All" },
  { value: "waiting", label: "Waiting" },
  { value: "near_deadline", label: "Near deadline" },
  { value: "violated", label: "Violated" },
  { value: "completed", label: "Completed" },
] as const;

type TabValue = (typeof tabs)[number]["value"];

function SummaryCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
  active,
  onClick,
}: {
  label: string;
  value: number;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone?: "default" | "warning" | "danger" | "success";
  active?: boolean;
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
        "rounded-2xl text-left outline-none transition-colors focus-visible:ring-[3px] focus-visible:ring-ring/50",
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
          <div className="flex items-center justify-between gap-2">
            <CardDescription className="text-xs font-medium">
              {label}
            </CardDescription>
            <span className="grid size-8 place-items-center rounded-lg bg-muted text-muted-foreground">
              <Icon className="size-4" />
            </span>
          </div>
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

export function WorkflowsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<TabValue>("all");
  const [search, setSearch] = useState("");
  const environment = searchParams.get("environment") ?? "production";
  const queryString = searchParams.toString();

  const query = useWorkflows({
    environment,
    search,
    state: searchParams.get("state") === "error" ? "error" : tab,
  });

  const items = useMemo(() => query.data?.items ?? [], [query.data]);

  const counts = useMemo(() => {
    const byState = (state: WorkflowState) =>
      items.filter((item) => item.state === state).length;
    return {
      total: items.length,
      waiting: byState("waiting"),
      near: byState("near_deadline"),
      violated: byState("violated"),
      completed: byState("completed"),
    };
  }, [items]);

  const columns = useMemo(
    () =>
      getWorkflowColumns({
        onOpen: (workflow) => {
          router.push(
            `/workflows/${workflow.id}${queryString ? `?${queryString}` : ""}`,
          );
        },
        onViewRule: (workflow) => {
          router.push(`/explore?rule=${encodeURIComponent(workflow.ruleId)}`);
        },
      }),
    [queryString, router],
  );

  const dataState = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : items.length === 0
        ? search || tab !== "all"
          ? "filtered-empty"
          : "empty"
        : "ready";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Workflow explorer"
        title="Workflows"
        description="Search, filter, and inspect workflow instances while preserving analytical context."
        actions={
          <div className="flex items-center gap-2">
            {query.isFetching && !query.isLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="size-3 animate-spin" />
                Refreshing
              </span>
            ) : null}
            <Button
              variant="outline"
              size="sm"
              onClick={() => void query.refetch()}
              disabled={query.isFetching}
            >
              <RefreshCw className={cn(query.isFetching && "animate-spin")} />
              Refresh
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => router.push("/live")}
            >
              <Activity />
              Open live
            </Button>
          </div>
        }
      />

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Workflow summary"
      >
        <SummaryCard
          label="In view"
          value={counts.total}
          hint={`${environment} environment`}
          icon={Activity}
          active={tab === "all"}
          onClick={() => setTab("all")}
        />
        <SummaryCard
          label="Near deadline"
          value={counts.near}
          hint="Approaching evaluation window"
          icon={Timer}
          tone="warning"
          active={tab === "near_deadline"}
          onClick={() => setTab("near_deadline")}
        />
        <SummaryCard
          label="Violated"
          value={counts.violated}
          hint="Missed business promises"
          icon={AlertTriangle}
          tone="danger"
          active={tab === "violated"}
          onClick={() => setTab("violated")}
        />
        <SummaryCard
          label="Completed"
          value={counts.completed}
          hint="Finished within expectations"
          icon={CheckCircle2}
          tone="success"
          active={tab === "completed"}
          onClick={() => setTab("completed")}
        />
      </section>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-4 border-b py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-base">Instances</CardTitle>
              <CardDescription>
                Sort by urgency, filter columns, and open investigation detail.
              </CardDescription>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:items-center xl:w-auto">
              <Tabs
                value={tab}
                onValueChange={(value) => {
                  if (tabs.some((item) => item.value === value)) {
                    setTab(value as TabValue);
                  }
                }}
              >
                <TabsList className="h-auto w-full flex-wrap justify-start">
                  {tabs.map((item) => (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="px-2.5 text-xs sm:text-sm"
                    >
                      {item.label}
                      {item.value !== "all" ? (
                        <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                          {item.value === "waiting"
                            ? counts.waiting
                            : item.value === "near_deadline"
                              ? counts.near
                              : item.value === "violated"
                                ? counts.violated
                                : counts.completed}
                        </Badge>
                      ) : null}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </div>
          </div>
          <InputGroup className="w-full sm:max-w-md">
            <InputGroupAddon>
              <Search />
            </InputGroupAddon>
            <InputGroupInput
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Workflow, rule, service, entity, event…"
            />
          </InputGroup>
        </CardHeader>

        <CardContent className="p-0">
          <DataState
            state={dataState}
            onRetry={() => void query.refetch()}
            title={
              dataState === "filtered-empty"
                ? "No workflows match these filters"
                : "No workflows yet"
            }
            description={
              dataState === "filtered-empty"
                ? "Try another state tab or clear the search."
                : "Workflow instances will appear here as events stream in."
            }
          >
            <DataTable
              columns={columns}
              data={items}
              getRowId={(row) => row.id}
              filterColumn="workflowType"
              filterPlaceholder="Filter visible rows…"
              emptyMessage="No workflows match the current table filters."
              enableClientPagination
              tableClassName="rounded-none border-0"
              className="[&>div:first-child]:px-4"
              toolbarActions={
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock3 className="size-3.5" />
                  {query.data?.total ?? 0} in scope
                </div>
              }
            />
          </DataState>
        </CardContent>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            Showing {items.length}
            {query.data?.total != null ? ` of ${query.data.total}` : ""}{" "}
            workflows
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Badge variant="outline" className="font-normal capitalize">
              {environment}
            </Badge>
            Auto-refresh every 12s
          </span>
        </div>
      </Card>
    </div>
  );
}
