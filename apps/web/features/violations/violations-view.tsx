"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  BarChart3,
  Boxes,
  Grid3X3,
  List,
  RefreshCw,
  Search,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  XAxis,
  YAxis,
} from "recharts";
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
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DataTable } from "@/components/ui/data-table";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import {
  NativeSelect,
  NativeSelectOption,
} from "@/components/ui/native-select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { ViolationSummary } from "@/lib/contracts";
import { useViolations } from "@/lib/queries";
import { cn, formatChartAxisDate, statusVariant } from "@/lib/utils";
import { getViolationColumns } from "./columns";

const views = [
  { value: "table", label: "Table", icon: List },
  { value: "trend", label: "Trend", icon: TrendingUp },
  { value: "groups", label: "Groups", icon: Boxes },
  { value: "heatmap", label: "Heatmap", icon: Grid3X3 },
  { value: "impact", label: "Impact", icon: BarChart3 },
] as const;

type ViewValue = (typeof views)[number]["value"];

const trendChartConfig = {
  count: { label: "Violations", color: "var(--destructive)" },
} satisfies ChartConfig;

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

function AlternativeViolationView({
  view,
  items,
}: {
  view: Exclude<ViewValue, "table">;
  items: ViolationSummary[];
}) {
  const latestTimestamp = Math.max(
    Date.now(),
    ...items.map((item) => new Date(item.occurredAt).getTime()),
  );

  const trend = Array.from({ length: 12 }, (_, index) => {
    const bucketStart = latestTimestamp - (12 - index) * 2 * 60 * 60 * 1000;
    const count = items.filter((item) => {
      const timestamp = new Date(item.occurredAt).getTime();
      return (
        timestamp >= bucketStart &&
        timestamp < bucketStart + 2 * 60 * 60 * 1000
      );
    }).length;
    return {
      timestamp: new Date(bucketStart).toISOString(),
      count,
    };
  });

  const groups = Object.values(
    items.reduce<
      Record<
        string,
        {
          ruleId: string;
          ruleName: string;
          severity: ViolationSummary["severity"];
          count: number;
          services: Set<string>;
        }
      >
    >((result, item) => {
      const group = result[item.ruleId] ?? {
        ruleId: item.ruleId,
        ruleName: item.ruleName,
        severity: item.severity,
        count: 0,
        services: new Set<string>(),
      };
      group.count += 1;
      if (item.serviceName) group.services.add(item.serviceName);
      result[item.ruleId] = group;
      return result;
    }, {}),
  ).sort((left, right) => right.count - left.count);

  if (view === "trend") {
    return (
      <div className="p-4 sm:p-5">
        <ChartContainer
          config={trendChartConfig}
          className="aspect-auto h-72 w-full"
        >
          <BarChart data={trend} margin={{ left: 8, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="timestamp"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              minTickGap={28}
              tickFormatter={(value) => formatChartAxisDate(String(value))}
            />
            <YAxis
              allowDecimals={false}
              tickLine={false}
              axisLine={false}
              width={32}
            />
            <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent hideLabel />}
            />
            <Bar
              dataKey="count"
              fill="var(--color-count)"
              radius={[6, 6, 0, 0]}
            />
          </BarChart>
        </ChartContainer>
        <p className="mt-3 text-sm text-muted-foreground">
          Twelve two-hour periods across the current result set.
        </p>
      </div>
    );
  }

  if (view === "groups") {
    return (
      <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5 xl:grid-cols-3">
        {groups.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No rule groups in the current result set.
          </p>
        ) : (
          groups.map((group) => (
            <Card key={group.ruleId} size="sm" className="gap-3 py-4">
              <CardHeader className="px-4">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={statusVariant(group.severity)}
                    className="capitalize"
                  >
                    {group.severity}
                  </Badge>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {group.count} open
                  </span>
                </div>
                <CardTitle className="text-sm leading-snug">
                  {group.ruleName}
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 text-xs text-muted-foreground">
                {[...group.services].join(", ") || "unknown service"}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    );
  }

  if (view === "heatmap") {
    const services = [
      ...new Set(items.map((item) => item.serviceName).filter(Boolean)),
    ] as string[];
    const rows = services.length > 0 ? services.slice(0, 5) : ["unknown"];
    return (
      <div className="p-4 sm:p-5">
        <div
          className="grid gap-1"
          style={{
            gridTemplateColumns: `minmax(96px,120px) repeat(12, minmax(18px, 1fr))`,
          }}
          role="img"
          aria-label="Violation heatmap across services and time."
        >
          <span />
          {Array.from({ length: 12 }, (_, index) => (
            <span
              key={index}
              className="text-center text-[10px] text-muted-foreground"
            >
              {index * 2}h
            </span>
          ))}
          {rows.flatMap((service) => [
            <span
              key={`${service}-label`}
              className="truncate py-1 pr-1 text-xs"
              title={service}
            >
              {service}
            </span>,
            ...Array.from({ length: 12 }, (_, bucketIndex) => {
              const bucketStart =
                latestTimestamp - (12 - bucketIndex) * 2 * 60 * 60 * 1000;
              const count = items.filter((item) => {
                const timestamp = new Date(item.occurredAt).getTime();
                const serviceName = item.serviceName ?? "unknown";
                return (
                  serviceName === service &&
                  timestamp >= bucketStart &&
                  timestamp < bucketStart + 2 * 60 * 60 * 1000
                );
              }).length;
              return (
                <span
                  key={`${service}-${bucketIndex}`}
                  title={`${service}: ${count} violations`}
                  className="min-h-7 rounded-md border border-border"
                  style={{
                    background:
                      count === 0
                        ? "var(--muted)"
                        : `color-mix(in srgb, var(--destructive) ${Math.min(90, 20 + count * 20)}%, var(--card))`,
                  }}
                />
              );
            }),
          ])}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Cells represent observed violations by service and two-hour period.
        </p>
      </div>
    );
  }

  const impact = [
    {
      label: "Affected workflows",
      value: new Set(items.map((item) => item.workflowId)).size,
    },
    {
      label: "Affected services",
      value: new Set(
        items.map((item) => item.serviceName).filter(Boolean),
      ).size,
    },
    {
      label: "Critical rules",
      value: new Set(
        items
          .filter((item) => item.severity === "critical")
          .map((item) => item.ruleId),
      ).size,
    },
  ];

  return (
    <div className="grid gap-3 p-4 sm:grid-cols-3 sm:p-5">
      {impact.map((item) => (
        <Card key={item.label} size="sm" className="gap-2 py-5">
          <CardHeader className="px-5 pb-0">
            <CardDescription>{item.label}</CardDescription>
          </CardHeader>
          <CardContent className="px-5">
            <p className="text-3xl font-semibold tabular-nums">{item.value}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function ViolationsView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [view, setView] = useState<ViewValue>("table");
  const [search, setSearch] = useState("");
  const [severity, setSeverity] = useState("all");
  const [status, setStatus] = useState("all");
  const environment = searchParams.get("environment") ?? "production";
  const queryString = searchParams.toString();

  const query = useViolations({
    environment,
    search,
    state: searchParams.get("state") ?? undefined,
  });

  const items = query.data?.items ?? [];

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSeverity =
        severity === "all" ? true : item.severity === severity;
      const matchesStatus = status === "all" ? true : item.status === status;
      return matchesSeverity && matchesStatus;
    });
  }, [items, severity, status]);

  const counts = useMemo(() => {
    return {
      total: items.length,
      critical: items.filter((item) => item.severity === "critical").length,
      warning: items.filter((item) => item.severity === "warning").length,
      open: items.filter((item) => item.status === "open").length,
    };
  }, [items]);

  const columns = useMemo(
    () =>
      getViolationColumns({
        onOpen: (violation) => {
          router.push(
            `/violations/${violation.id}${queryString ? `?${queryString}` : ""}`,
          );
        },
        onOpenWorkflow: (violation) => {
          router.push(
            `/workflows/${violation.workflowId}${queryString ? `?${queryString}` : ""}`,
          );
        },
        onOpenRule: (violation) => {
          router.push(`/explore?rule=${encodeURIComponent(violation.ruleId)}`);
        },
      }),
    [queryString, router],
  );

  const state = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : items.length === 0
        ? search
          ? "filtered-empty"
          : "empty"
        : filteredItems.length === 0
          ? "filtered-empty"
          : "ready";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Policy failures"
        title="Violations"
        description="Explore missed, late, out-of-order, and forbidden outcomes, then inspect correlated technical evidence."
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
          </div>
        }
      />

      <section
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
        aria-label="Violations summary"
      >
        <SummaryCard
          label="In view"
          value={counts.total}
          hint={`${environment} environment`}
          icon={ShieldAlert}
          active={severity === "all" && status === "all"}
          onClick={() => {
            setSeverity("all");
            setStatus("all");
          }}
        />
        <SummaryCard
          label="Critical"
          value={counts.critical}
          hint="Highest severity failures"
          icon={AlertTriangle}
          tone="danger"
          active={severity === "critical"}
          onClick={() => setSeverity("critical")}
        />
        <SummaryCard
          label="Warning"
          value={counts.warning}
          hint="Needs attention soon"
          icon={AlertTriangle}
          tone="warning"
          active={severity === "warning"}
          onClick={() => setSeverity("warning")}
        />
        <SummaryCard
          label="Open"
          value={counts.open}
          hint="Not yet resolved"
          icon={List}
          active={status === "open"}
          onClick={() => setStatus("open")}
        />
      </section>

      <Card className="gap-0 overflow-hidden py-0">
        <CardHeader className="gap-4 border-b py-4">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div>
              <CardTitle className="text-base">Investigation board</CardTitle>
              <CardDescription>
                Switch between table and analytical views without losing filters.
              </CardDescription>
            </div>
            <Tabs
              value={view}
              onValueChange={(value) => {
                if (views.some((item) => item.value === value)) {
                  setView(value as ViewValue);
                }
              }}
            >
              <TabsList className="h-auto w-full flex-wrap justify-start">
                {views.map((item) => {
                  const Icon = item.icon;
                  return (
                    <TabsTrigger
                      key={item.value}
                      value={item.value}
                      className="gap-1.5 px-2.5 text-xs sm:text-sm"
                    >
                      <Icon className="size-3.5" />
                      {item.label}
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </Tabs>
          </div>

          <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
            <InputGroup className="w-full lg:max-w-md">
              <InputGroupAddon>
                <Search />
              </InputGroupAddon>
              <InputGroupInput
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rule, service, event, explanation…"
              />
            </InputGroup>
            <div className="flex flex-wrap gap-2">
              <NativeSelect
                className="w-full sm:w-40"
                value={severity}
                onChange={(event) => setSeverity(event.target.value)}
              >
                <NativeSelectOption value="all">
                  All severities
                </NativeSelectOption>
                <NativeSelectOption value="critical">
                  Critical
                </NativeSelectOption>
                <NativeSelectOption value="warning">Warning</NativeSelectOption>
                <NativeSelectOption value="info">Info</NativeSelectOption>
              </NativeSelect>
              <NativeSelect
                className="w-full sm:w-40"
                value={status}
                onChange={(event) => setStatus(event.target.value)}
              >
                <NativeSelectOption value="all">All statuses</NativeSelectOption>
                <NativeSelectOption value="open">Open</NativeSelectOption>
                <NativeSelectOption value="acknowledged">
                  Acknowledged
                </NativeSelectOption>
                <NativeSelectOption value="resolved">
                  Resolved
                </NativeSelectOption>
              </NativeSelect>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <DataState
            state={state}
            onRetry={() => void query.refetch()}
            title={
              state === "filtered-empty"
                ? "No violations match these filters"
                : "No violations in this period"
            }
            description={
              state === "filtered-empty"
                ? "Try clearing severity, status, or search."
                : "Violations will appear here as rules fail evaluation."
            }
          >
            {view === "table" ? (
              <DataTable
                columns={columns}
                data={filteredItems}
                getRowId={(row) => row.id}
                filterColumn="explanation"
                filterPlaceholder="Filter visible rows…"
                emptyMessage="No violations match the current table filters."
                enableClientPagination
                tableClassName="rounded-none border-0"
                className="[&>div:first-child]:px-4"
                toolbarActions={
                  <div className="text-xs text-muted-foreground">
                    {filteredItems.length} shown
                  </div>
                }
              />
            ) : (
              <AlternativeViolationView
                view={view}
                items={filteredItems}
              />
            )}
          </DataState>
        </CardContent>

        <div className="flex items-center justify-between border-t border-border px-4 py-3 text-xs text-muted-foreground">
          <span>
            {filteredItems.length} of {items.length} violations
          </span>
          <Badge variant="outline" className="font-normal capitalize">
            {environment}
          </Badge>
        </div>
      </Card>
    </div>
  );
}
