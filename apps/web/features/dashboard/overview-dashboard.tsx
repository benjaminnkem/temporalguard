"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowDownRight,
  ArrowUpRight,
  ChevronRight,
  CircleHelp,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "../../components/shared/page-header";
import { DataState } from "../../components/shared/data-state";
import { Badge, Card, Skeleton } from "../../components/ui/surface";
import { Button } from "../../components/ui/button";
import { useDashboard } from "../../lib/queries";
import { formatDate, formatDuration } from "../../lib/utils";

const modes = ["volume", "completionRate", "violations", "duration"] as const;

export function OverviewDashboard() {
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<(typeof modes)[number]>("volume");
  const environment = searchParams.get("environment") ?? "production";
  const requestedState = searchParams.get("state") ?? undefined;
  const query = useDashboard({ environment, state: requestedState });
  const dataState = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : "ready";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Reliability overview"
        title="Workflow health"
        description="Understand whether business promises complete on time, then move directly into the affected workflows and evidence."
        actions={
          <>
            {query.isFetching && !query.isLoading ? (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <RefreshCw className="size-3 animate-spin" />
                Refreshing
              </span>
            ) : null}
            <Button asChild variant="primary">
              <Link href="/explore">Build analysis</Link>
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
            <section
              className="metric-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
              aria-label="Summary metrics"
            >
              {query.data.metrics.map((metric, index) => {
                const favorable =
                  metric.favorable === "up"
                    ? metric.delta >= 0
                    : metric.delta <= 0;
                return (
                  <Card
                    key={metric.id}
                    decoration={
                      index === 0 ? "tape" : index === 4 ? "tack" : "none"
                    }
                    className="sketch-enter group relative min-h-36 overflow-hidden p-4 transition-colors hover:border-border-strong"
                    style={
                      {
                        animationDelay: `${index * 45}ms`,
                      } as React.CSSProperties
                    }
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        {metric.label}
                      </p>
                      <CircleHelp
                        className="size-3.5 text-muted-foreground"
                        aria-label={metric.description}
                      />
                    </div>
                    <p className="mt-4 text-2xl font-semibold tracking-tight tabular-nums">
                      {metric.value}
                    </p>
                    <div className="mt-3 flex items-center gap-1.5 text-xs">
                      <span
                        className={
                          favorable ? "text-success" : "text-destructive"
                        }
                      >
                        {metric.delta >= 0 ? (
                          <ArrowUpRight className="inline size-3.5" />
                        ) : (
                          <ArrowDownRight className="inline size-3.5" />
                        )}
                        {Math.abs(metric.delta)}%
                      </span>
                      <span className="text-muted-foreground">
                        vs previous period
                      </span>
                    </div>
                    <div className="absolute right-0 bottom-0 left-0 h-1 bg-primary-subtle">
                      <div className="h-full w-2/3 bg-primary opacity-50" />
                    </div>
                  </Card>
                );
              })}
            </section>

            <section className="grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
              <Card className="min-w-0 p-4 sm:p-5">
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h2 className="font-semibold">Reliability over time</h2>
                    <p className="text-xs text-muted-foreground">
                      Previous-period comparison · deployment markers enabled
                    </p>
                  </div>
                  <div className="flex max-w-full gap-1 overflow-x-auto rounded-[var(--radius-md)] bg-muted p-1">
                    {modes.map((item) => (
                      <button
                        key={item}
                        onClick={() => setMode(item)}
                        className={`relative rounded-[var(--radius-sm)] border-2 border-transparent px-2.5 py-1.5 text-sm font-medium whitespace-nowrap ${
                          mode === item
                            ? "text-foreground"
                            : "text-muted-foreground"
                        }`}
                      >
                        {mode === item ? (
                          <motion.span
                            layoutId="dashboard-mode"
                            className="absolute inset-0 rounded-[var(--radius-sm)] border-2 border-border bg-surface shadow-[2px_2px_0_var(--shadow-ink)]"
                            transition={{
                              type: "spring",
                              bounce: 0.25,
                              duration: 0.35,
                            }}
                          />
                        ) : null}
                        <span className="relative z-10">
                          {item === "completionRate"
                            ? "Completion rate"
                            : item.charAt(0).toUpperCase() + item.slice(1)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={mode}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -5 }}
                    transition={{ duration: 0.16 }}
                    className="h-72 w-full"
                    aria-hidden="true"
                  >
                    <ResponsiveContainer>
                      <AreaChart data={query.data.reliabilitySeries}>
                        <defs>
                          <linearGradient
                            id="purpleFill"
                            x1="0"
                            y1="0"
                            x2="0"
                            y2="1"
                          >
                            <stop
                              offset="5%"
                              stopColor="var(--chart-purple)"
                              stopOpacity={0.24}
                            />
                            <stop
                              offset="95%"
                              stopColor="var(--chart-purple)"
                              stopOpacity={0}
                            />
                          </linearGradient>
                        </defs>
                        <CartesianGrid
                          stroke="var(--chart-grid)"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="timestamp"
                          stroke="var(--chart-axis)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <YAxis
                          stroke="var(--chart-axis)"
                          fontSize={11}
                          tickLine={false}
                          axisLine={false}
                        />
                        <Tooltip
                          contentStyle={{
                            background: "var(--popover)",
                            border: "2px solid var(--border)",
                            borderRadius: "var(--radius-md)",
                            boxShadow: "4px 4px 0 var(--shadow-ink)",
                          }}
                        />
                        <Area
                          type="monotone"
                          dataKey={mode}
                          stroke="var(--chart-purple)"
                          fill="url(#purpleFill)"
                          strokeWidth={2}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </motion.div>
                </AnimatePresence>
                <p className="sr-only">
                  Reliability chart showing {mode} over twelve two-hour periods.
                  Values range from{" "}
                  {Math.min(
                    ...query.data.reliabilitySeries.map((point) => point[mode]),
                  )}{" "}
                  to{" "}
                  {Math.max(
                    ...query.data.reliabilitySeries.map((point) => point[mode]),
                  )}
                  . The latest value is{" "}
                  {query.data.reliabilitySeries.at(-1)?.[mode]}.
                </p>
              </Card>

              <Card className="p-4 sm:p-5">
                <div className="mb-4">
                  <h2 className="font-semibold">Deadline pressure</h2>
                  <p className="text-xs text-muted-foreground">
                    Open workflows by remaining time
                  </p>
                </div>
                <div className="h-72" aria-hidden="true">
                  <ResponsiveContainer>
                    <BarChart
                      data={query.data.deadlineBuckets}
                      layout="vertical"
                      margin={{ left: 8 }}
                    >
                      <CartesianGrid
                        stroke="var(--chart-grid)"
                        horizontal={false}
                      />
                      <XAxis
                        type="number"
                        stroke="var(--chart-axis)"
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        dataKey="bucket"
                        type="category"
                        width={58}
                        stroke="var(--chart-axis)"
                        fontSize={11}
                        axisLine={false}
                        tickLine={false}
                      />
                      <Tooltip
                        contentStyle={{
                          background: "var(--popover)",
                          border: "2px solid var(--border)",
                          borderRadius: "var(--radius-md)",
                          boxShadow: "4px 4px 0 var(--shadow-ink)",
                        }}
                      />
                      <Bar dataKey="count" radius={[0, 8, 3, 0]}>
                        {query.data.deadlineBuckets.map((bucket, index) => (
                          <Cell
                            key={bucket.bucket}
                            fill={
                              index === 3
                                ? "var(--destructive)"
                                : index < 2
                                  ? "var(--warning)"
                                  : "var(--chart-blue)"
                            }
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <ul className="sr-only">
                  {query.data.deadlineBuckets.map((bucket) => (
                    <li key={bucket.bucket}>
                      {bucket.bucket}: {bucket.count} workflows
                    </li>
                  ))}
                </ul>
              </Card>
            </section>

            <section className="grid gap-4 xl:grid-cols-2">
              <Card className="p-4 sm:p-5">
                <div className="mb-5 flex items-center justify-between">
                  <div>
                    <h2 className="font-semibold">Workflow funnel</h2>
                    <p className="text-xs text-muted-foreground">
                      Application decision · within 4 hours
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    Configure
                  </Button>
                </div>
                <div className="grid gap-3">
                  {[
                    ["Application submitted", 12_840, 100],
                    ["Documents verified", 11_942, 93],
                    ["Review completed", 10_917, 85],
                    ["Decision issued", 10_504, 82],
                  ].map(([label, value, percent], index) => (
                    <button
                      key={String(label)}
                      className="group grid grid-cols-[minmax(120px,1fr)_auto] items-center gap-3 text-left"
                    >
                      <div>
                        <div className="mb-1 flex justify-between text-xs">
                          <span>{label}</span>
                          <span className="text-muted-foreground">
                            {Number(percent)}%
                          </span>
                        </div>
                        <div className="h-7 overflow-hidden rounded-[var(--radius-sm)] bg-muted">
                          <div
                            className="flex h-full items-center bg-primary-subtle px-2 text-xs font-medium text-primary-subtle-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground"
                            style={{ width: `${Number(percent)}%` }}
                          >
                            {Number(value).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      {index < 3 ? (
                        <ChevronRight className="size-4 text-muted-foreground" />
                      ) : (
                        <span className="size-4" />
                      )}
                    </button>
                  ))}
                </div>
              </Card>

              <Card className="p-4 sm:p-5">
                <div className="mb-5">
                  <h2 className="font-semibold">Violation heatmap</h2>
                  <p className="text-xs text-muted-foreground">
                    Rule by hour · darker cells indicate more violations
                  </p>
                </div>
                <div
                  className="grid grid-cols-[110px_repeat(8,minmax(24px,1fr))] gap-1 text-xs"
                  role="img"
                  aria-label="Violation heatmap. Decision issued within 4 hours is the highest-volume rule, peaking at six violations around 06:00."
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
                  {[
                    ["Decision SLA", 1, 2, 6, 4, 2, 1, 3, 1],
                    ["Document verify", 0, 1, 2, 1, 3, 1, 0, 1],
                    ["Consent policy", 0, 0, 1, 0, 0, 2, 1, 0],
                    ["Video sequence", 1, 0, 2, 0, 1, 0, 2, 1],
                  ].flatMap(([label, ...values]) => [
                    <span key={`${label}-label`} className="truncate py-2">
                      {label}
                    </span>,
                    ...values.map((value, index) => (
                      <span
                        key={`${label}-${index}`}
                        title={`${label}: ${value} violations`}
                        className="min-h-8 rounded-[var(--radius-xs)] border border-border"
                        style={{
                          background:
                            Number(value) === 0
                              ? "var(--surface-subtle)"
                              : `color-mix(in srgb, var(--destructive) ${20 + Number(value) * 12}%, var(--surface))`,
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
                      className="size-3 rounded-[2px]"
                      style={{
                        background: `color-mix(in srgb, var(--destructive) ${opacity}%, var(--surface))`,
                      }}
                    />
                  ))}
                  <span>More</span>
                </div>
              </Card>
            </section>

            <Card className="overflow-hidden">
              <div className="flex items-center justify-between border-b border-border p-4 sm:px-5">
                <div>
                  <h2 className="font-semibold">Recent violations</h2>
                  <p className="text-xs text-muted-foreground">
                    Open a record without losing dashboard context
                  </p>
                </div>
                <Button variant="ghost" size="sm" asChild>
                  <Link href="/violations">View all</Link>
                </Button>
              </div>
              {requestedState === "partial" ? (
                <div className="border-b border-warning bg-warning-subtle p-3 text-sm text-warning">
                  Recent violations are delayed. Other dashboard data is
                  current.
                </div>
              ) : query.data.recentViolations.length === 0 ? (
                <DataState state="empty" title="No violations in this period">
                  <span />
                </DataState>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] border-collapse text-left text-sm">
                    <thead className="bg-surface-subtle text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">Severity</th>
                        <th className="px-4 py-3 font-medium">Violation</th>
                        <th className="px-4 py-3 font-medium">Workflow</th>
                        <th className="px-4 py-3 font-medium">Service</th>
                        <th className="px-4 py-3 font-medium">Overdue</th>
                        <th className="px-4 py-3 font-medium">Time</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.recentViolations.map((violation) => (
                        <tr
                          key={violation.id}
                          className="border-t border-border hover:bg-surface-subtle"
                        >
                          <td className="px-4 py-3">
                            <Badge
                              tone={
                                violation.severity === "critical"
                                  ? "danger"
                                  : "warning"
                              }
                            >
                              {violation.severity}
                            </Badge>
                          </td>
                          <td className="max-w-md px-4 py-3">
                            <Link
                              href={`/violations/${violation.id}?${searchParams.toString()}`}
                              className="font-medium hover:text-primary"
                            >
                              {violation.explanation}
                            </Link>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {violation.ruleName}
                            </p>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs">
                            {violation.workflowId}
                          </td>
                          <td className="px-4 py-3">{violation.serviceName}</td>
                          <td className="px-4 py-3 tabular-nums">
                            {violation.overdueMs
                              ? formatDuration(violation.overdueMs)
                              : "—"}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {formatDate(violation.occurredAt)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        ) : (
          <div className="grid gap-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-72" />
          </div>
        )}
      </DataState>
    </div>
  );
}
