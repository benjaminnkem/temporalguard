"use client";

import { ArrowDownRight, ArrowUpRight, CircleHelp } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  XAxis,
  YAxis,
} from "recharts";
import { DataState } from "@/components/shared/data-state";
import { PageHeader } from "@/components/shared/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
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
import { Skeleton } from "@/components/ui/skeleton";
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { ViolationSummary } from "@/lib/contracts";
import { useDashboard } from "@/lib/queries";
import { cn, formatDate, formatDuration, statusVariant } from "@/lib/utils";

const modes = ["volume", "completionRate", "violations", "duration"] as const;
type Mode = (typeof modes)[number];

const modeLabels: Record<Mode, string> = {
  volume: "Volume",
  completionRate: "Completion rate",
  violations: "Violations",
  duration: "Duration",
};

const reliabilityChartConfig = {
  volume: { label: "Volume", color: "var(--primary)" },
  completionRate: { label: "Completion rate", color: "var(--primary)" },
  violations: { label: "Violations", color: "var(--destructive)" },
  duration: { label: "Duration", color: "var(--chart-2)" },
} satisfies ChartConfig;

const deadlineChartConfig = {
  count: { label: "Workflows", color: "var(--primary)" },
} satisfies ChartConfig;

const deadlineFills = [
  "var(--warning)",
  "var(--warning)",
  "var(--primary)",
  "var(--destructive)",
];

function violationComposition(items: ViolationSummary[]) {
  const counts = new Map<string, number>();
  items.forEach((item) =>
    counts.set(item.type, (counts.get(item.type) ?? 0) + 1),
  );
  const rows = [...counts.entries()].sort((left, right) => right[1] - left[1]);
  const maximum = Math.max(1, ...rows.map(([, count]) => count));
  return rows.map(([type, count]) => ({
    label: type.replaceAll("_", " "),
    count,
    percent: (count / maximum) * 100,
  }));
}

function violationHeatmap(items: ViolationSummary[]) {
  const rules = [...new Set(items.map((item) => item.ruleName))].slice(0, 4);
  return rules.map((rule) => ({
    label: rule,
    values: Array.from(
      { length: 8 },
      (_, bucket) =>
        items.filter((item) => {
          const hour = new Date(item.occurredAt).getHours();
          return item.ruleName === rule && Math.floor(hour / 3) === bucket;
        }).length,
    ),
  }));
}

function MetricCards({
  metrics,
}: {
  metrics: NonNullable<ReturnType<typeof useDashboard>["data"]>["metrics"];
}) {
  return (
    <section
      className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      aria-label="Summary metrics"
    >
      {metrics.map((metric) => {
        const favorable =
          metric.favorable === "up" ? metric.delta >= 0 : metric.delta <= 0;
        return (
          <Card key={metric.id} size="sm" className="relative gap-3 py-4">
            <CardHeader className="px-4">
              <CardDescription className="text-xs font-medium">
                {metric.label}
              </CardDescription>
              <CardAction>
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <button
                        type="button"
                        className="text-muted-foreground transition-colors hover:text-foreground"
                        aria-label={metric.description}
                      />
                    }
                  >
                    <CircleHelp className="size-3.5" />
                  </TooltipTrigger>
                  <TooltipContent>{metric.description}</TooltipContent>
                </Tooltip>
              </CardAction>
            </CardHeader>
            <CardContent className="px-4">
              <p className="text-2xl font-semibold tracking-tight tabular-nums">
                {metric.value}
              </p>
              <div className="mt-2 flex items-center gap-1.5 text-xs">
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 font-medium",
                    favorable ? "text-success" : "text-destructive",
                  )}
                >
                  {metric.delta >= 0 ? (
                    <ArrowUpRight className="size-3.5" />
                  ) : (
                    <ArrowDownRight className="size-3.5" />
                  )}
                  {Math.abs(metric.delta)}%
                </span>
                <span className="text-muted-foreground">vs previous</span>
              </div>
            </CardContent>
            <div className="absolute inset-x-0 bottom-0 h-1 bg-muted">
              <div
                className={cn(
                  "h-full w-2/3",
                  favorable ? "bg-primary/50" : "bg-destructive/50",
                )}
              />
            </div>
          </Card>
        );
      })}
    </section>
  );
}

export function OverviewDashboard() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<Mode>("volume");
  const environment = searchParams.get("environment") ?? "production";
  const requestedState = searchParams.get("state") ?? undefined;
  const query = useDashboard({ environment, state: requestedState });
  const dataState = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : "ready";

  const composition = useMemo(
    () =>
      query.data ? violationComposition(query.data.recentViolations) : [],
    [query.data],
  );
  const heatmap = useMemo(
    () => (query.data ? violationHeatmap(query.data.recentViolations) : []),
    [query.data],
  );

  const reliabilityMin = query.data
    ? Math.min(...query.data.reliabilitySeries.map((point) => point[mode]))
    : 0;
  const reliabilityMax = query.data
    ? Math.max(...query.data.reliabilitySeries.map((point) => point[mode]))
    : 0;

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Reliability overview"
        title="Workflow health"
        description="Understand whether business promises complete on time, then move directly into the affected workflows and evidence."
        actions={
          <>
            {query.isFetching && !query.isLoading ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner className="size-3" />
                Refreshing
              </span>
            ) : null}
            <Button size="sm" render={<Link href="/explore" />}>
              Build analysis
            </Button>
          </>
        }
      />

      <DataState
        state={dataState}
        title="Dashboard unavailable"
        onRetry={() => void query.refetch()}
      >
        {query.data ? (
          <>
            <MetricCards metrics={query.data.metrics} />

            <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
              <Card className="min-w-0">
                <CardHeader className="border-b">
                  <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
                    <div>
                      <CardTitle>Reliability over time</CardTitle>
                      <CardDescription>
                        Previous-period comparison · deployment markers enabled
                      </CardDescription>
                    </div>
                    <Tabs
                      value={mode}
                      onValueChange={(value) => {
                        if (
                          value === "volume" ||
                          value === "completionRate" ||
                          value === "violations" ||
                          value === "duration"
                        ) {
                          setMode(value);
                        }
                      }}
                    >
                      <TabsList className="h-auto w-full flex-wrap sm:w-auto">
                        {modes.map((item) => (
                          <TabsTrigger
                            key={item}
                            value={item}
                            className="px-2.5 text-xs sm:text-sm"
                          >
                            {modeLabels[item]}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                    </Tabs>
                  </div>
                </CardHeader>
                <CardContent className="pt-4">
                  <ChartContainer
                    config={reliabilityChartConfig}
                    className="aspect-auto h-72 w-full"
                    aria-hidden="true"
                  >
                    <AreaChart
                      data={query.data.reliabilitySeries}
                      margin={{ left: 8, right: 8, top: 8, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient
                          id="reliabilityFill"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor={`var(--color-${mode})`}
                            stopOpacity={0.28}
                          />
                          <stop
                            offset="95%"
                            stopColor={`var(--color-${mode})`}
                            stopOpacity={0.02}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} />
                      <XAxis
                        dataKey="timestamp"
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        minTickGap={24}
                      />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tickMargin={8}
                        width={40}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={
                          <ChartTooltipContent
                            labelKey="timestamp"
                            indicator="line"
                          />
                        }
                      />
                      <Area
                        type="monotone"
                        dataKey={mode}
                        stroke={`var(--color-${mode})`}
                        fill="url(#reliabilityFill)"
                        strokeWidth={2}
                      />
                    </AreaChart>
                  </ChartContainer>
                  <p className="sr-only">
                    Reliability chart showing {modeLabels[mode]} over twelve
                    two-hour periods. Values range from {reliabilityMin} to{" "}
                    {reliabilityMax}. The latest value is{" "}
                    {query.data.reliabilitySeries.at(-1)?.[mode]}.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Deadline pressure</CardTitle>
                  <CardDescription>
                    Open workflows by remaining time
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ChartContainer
                    config={deadlineChartConfig}
                    className="aspect-auto h-72 w-full"
                    aria-hidden="true"
                  >
                    <BarChart
                      data={query.data.deadlineBuckets}
                      layout="vertical"
                      margin={{ left: 4, right: 12, top: 8, bottom: 0 }}
                    >
                      <CartesianGrid horizontal={false} />
                      <XAxis type="number" tickLine={false} axisLine={false} />
                      <YAxis
                        dataKey="bucket"
                        type="category"
                        width={64}
                        tickLine={false}
                        axisLine={false}
                      />
                      <ChartTooltip
                        cursor={false}
                        content={<ChartTooltipContent hideLabel />}
                      />
                      <Bar dataKey="count" radius={6}>
                        {query.data.deadlineBuckets.map((bucket, index) => (
                          <Cell
                            key={bucket.bucket}
                            fill={
                              deadlineFills[index] ?? "var(--color-count)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ChartContainer>
                  <ul className="sr-only">
                    {query.data.deadlineBuckets.map((bucket) => (
                      <li key={bucket.bucket}>
                        {bucket.bucket}: {bucket.count} workflows
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Violation composition</CardTitle>
                  <CardDescription>
                    Types observed in the selected period
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 pt-5">
                  {composition.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No violation types were observed in this period.
                    </p>
                  ) : (
                    composition.map(({ label, count, percent }) => (
                      <div key={label} className="grid gap-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="capitalize">{label}</span>
                          <span className="tabular-nums text-muted-foreground">
                            {count}
                          </span>
                        </div>
                        <div className="h-2 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-[width]"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="border-b">
                  <CardTitle>Violation heatmap</CardTitle>
                  <CardDescription>
                    Rule by hour · darker cells indicate more violations
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-5">
                  <div
                    className="grid grid-cols-[minmax(96px,110px)_repeat(8,minmax(24px,1fr))] gap-1 text-xs"
                    role="img"
                    aria-label="Violation counts grouped by rule and three-hour time bucket."
                  >
                    <span />
                    {["00", "03", "06", "09", "12", "15", "18", "21"].map(
                      (hour) => (
                        <span
                          key={hour}
                          className="text-center text-[10px] text-muted-foreground"
                        >
                          {hour}
                        </span>
                      ),
                    )}
                    {heatmap.flatMap(({ label, values }) => [
                      <span
                        key={`${label}-label`}
                        className="truncate py-2 pr-1"
                        title={label}
                      >
                        {label}
                      </span>,
                      ...values.map((value, index) => (
                        <span
                          key={`${label}-${index}`}
                          title={`${label}: ${value} violations`}
                          className="min-h-8 rounded-md border border-border"
                          style={{
                            background:
                              value === 0
                                ? "var(--muted)"
                                : `color-mix(in srgb, var(--destructive) ${Math.min(90, 20 + value * 15)}%, var(--card))`,
                          }}
                        />
                      )),
                    ])}
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 text-[10px] text-muted-foreground">
                    <span>Fewer</span>
                    {[15, 35, 55, 75].map((opacity) => (
                      <span
                        key={opacity}
                        className="size-3 rounded-sm"
                        style={{
                          background: `color-mix(in srgb, var(--destructive) ${opacity}%, var(--card))`,
                        }}
                      />
                    ))}
                    <span>More</span>
                  </div>
                </CardContent>
              </Card>
            </section>

            <Card className="gap-0 py-0">
              <CardHeader className="border-b py-4">
                <div>
                  <CardTitle>Recent violations</CardTitle>
                  <CardDescription>
                    Open a record without losing dashboard context
                  </CardDescription>
                </div>
                <CardAction>
                  <Button
                    variant="ghost"
                    size="sm"
                    render={<Link href="/violations" />}
                  >
                    View all
                  </Button>
                </CardAction>
              </CardHeader>
              {requestedState === "partial" ? (
                <div className="border-b border-warning/30 bg-warning-subtle px-4 py-3 text-sm text-warning">
                  Recent violations are delayed. Other dashboard data is
                  current.
                </div>
              ) : null}
              {query.data.recentViolations.length === 0 ? (
                <CardContent className="py-6">
                  <DataState
                    state="empty"
                    title="No violations in this period"
                  >
                    <span />
                  </DataState>
                </CardContent>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Severity</TableHead>
                      <TableHead>Violation</TableHead>
                      <TableHead>Workflow</TableHead>
                      <TableHead>Service</TableHead>
                      <TableHead>Overdue</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {query.data.recentViolations.map((violation) => (
                      <TableRow key={violation.id}>
                        <TableCell>
                          <Badge
                            variant={statusVariant(violation.severity)}
                            className="capitalize"
                          >
                            {violation.severity}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-md whitespace-normal">
                          <Link
                            href={`/violations/${violation.id}?${searchParams.toString()}`}
                            className="font-medium hover:text-primary"
                          >
                            {violation.explanation}
                          </Link>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {violation.ruleName}
                          </p>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {violation.workflowId}
                        </TableCell>
                        <TableCell>{violation.serviceName}</TableCell>
                        <TableCell className="tabular-nums">
                          {violation.overdueMs
                            ? formatDuration(violation.overdueMs)
                            : "—"}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(violation.occurredAt)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-32 w-full rounded-2xl" />
              ))}
            </div>
            <Skeleton className="h-80 w-full rounded-2xl" />
          </div>
        )}
      </DataState>
    </div>
  );
}
