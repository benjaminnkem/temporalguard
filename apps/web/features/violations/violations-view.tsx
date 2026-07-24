"use client";

import {
  BarChart3,
  Boxes,
  Grid3X3,
  List,
  Search,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { DataState } from "../../components/shared/data-state";
import { PageHeader } from "../../components/shared/page-header";
import { Input } from "../../components/ui/input";
import { Badge, Card } from "../../components/ui/surface";
import { useViolations } from "../../lib/queries";
import { formatDate, formatDuration } from "../../lib/utils";

const views = [
  ["trend", "Trend", TrendingUp],
  ["table", "Table", List],
  ["groups", "Groups", Boxes],
  ["heatmap", "Heatmap", Grid3X3],
  ["impact", "Impact", BarChart3],
] as const;

export function ViolationsView() {
  const searchParams = useSearchParams();
  const [view, setView] = useState<(typeof views)[number][0]>("table");
  const [search, setSearch] = useState("");
  const environment = searchParams.get("environment") ?? "production";
  const query = useViolations({
    environment,
    search,
    state: searchParams.get("state") ?? undefined,
  });
  const state = query.isLoading
    ? "loading"
    : query.isError
      ? "error"
      : query.data?.items.length === 0
        ? search
          ? "filtered-empty"
          : "empty"
        : "ready";

  return (
    <div className="grid gap-6">
      <PageHeader
        eyebrow="Policy failures"
        title="Violations"
        description="Explore missed, late, out-of-order, and forbidden outcomes, then inspect correlated technical evidence."
      />
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-border p-4 xl:flex-row xl:items-center">
          <div className="flex gap-1 overflow-x-auto">
            {views.map(([id, label, Icon]) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={`flex min-h-9 items-center gap-2 rounded-[var(--radius-md)] px-3 text-xs font-medium ${
                  view === id
                    ? "bg-primary-subtle text-primary-subtle-foreground"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Icon className="size-3.5" />
                {label}
              </button>
            ))}
          </div>
          <div className="relative ml-auto w-full xl:max-w-sm">
            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              className="pl-9"
              placeholder="Rule, service, event, explanation…"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-2 border-b border-border bg-surface-subtle p-3">
          {[
            "Severity: all",
            "Status: open",
            "Type: all",
            "Service: all",
            "Deployment: all",
            "Overdue: any",
          ].map((filter) => (
            <button
              key={filter}
              className="rounded-full border border-border bg-surface px-2.5 py-1 text-xs text-muted-foreground hover:border-primary"
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="p-4">
          <DataState
            state={state}
            onRetry={() => void query.refetch()}
            title="Violations unavailable"
          >
            {view === "table" ? (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-muted-foreground">
                      <th className="px-3 py-3 font-medium">Severity</th>
                      <th className="px-3 py-3 font-medium">Explanation</th>
                      <th className="px-3 py-3 font-medium">Rule</th>
                      <th className="px-3 py-3 font-medium">Workflow</th>
                      <th className="px-3 py-3 font-medium">Service</th>
                      <th className="px-3 py-3 font-medium">Overdue</th>
                      <th className="px-3 py-3 font-medium">Occurred</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data?.items.map((violation) => (
                      <tr
                        key={violation.id}
                        className="border-b border-border hover:bg-surface-subtle"
                      >
                        <td className="px-3 py-3">
                          <Badge
                            tone={
                              violation.severity === "critical"
                                ? "danger"
                                : violation.severity === "warning"
                                  ? "warning"
                                  : "info"
                            }
                          >
                            {violation.severity}
                          </Badge>
                        </td>
                        <td className="max-w-md px-3 py-3">
                          <Link
                            href={`/violations/${violation.id}?${searchParams.toString()}`}
                            className="font-medium hover:text-primary"
                          >
                            {violation.explanation}
                          </Link>
                          <p className="mt-0.5 font-mono text-[10px] text-muted-foreground">
                            {violation.type}
                          </p>
                        </td>
                        <td className="px-3 py-3">{violation.ruleName}</td>
                        <td className="px-3 py-3 font-mono text-xs">
                          <Link
                            href={`/workflows/${violation.workflowId}?${searchParams.toString()}`}
                            className="hover:text-primary"
                          >
                            {violation.workflowId}
                          </Link>
                        </td>
                        <td className="px-3 py-3">{violation.serviceName}</td>
                        <td className="px-3 py-3 tabular-nums">
                          {violation.overdueMs
                            ? formatDuration(violation.overdueMs)
                            : "—"}
                        </td>
                        <td className="px-3 py-3 text-xs text-muted-foreground">
                          {formatDate(violation.occurredAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <AlternativeViolationView
                view={view}
                items={query.data?.items ?? []}
              />
            )}
          </DataState>
        </div>
      </Card>
    </div>
  );
}

function AlternativeViolationView({
  view,
  items,
}: {
  view: Exclude<(typeof views)[number][0], "table">;
  items: NonNullable<ReturnType<typeof useViolations>["data"]>["items"];
}) {
  const latestTimestamp = Math.max(
    Date.now(),
    ...items.map((item) => new Date(item.occurredAt).getTime()),
  );
  const trend = Array.from(
    { length: 12 },
    (_, index) =>
      items.filter((item) => {
        const timestamp = new Date(item.occurredAt).getTime();
        const bucketStart = latestTimestamp - (12 - index) * 2 * 60 * 60 * 1000;
        return (
          timestamp >= bucketStart &&
          timestamp < bucketStart + 2 * 60 * 60 * 1000
        );
      }).length,
  );
  const maximumTrend = Math.max(1, ...trend);
  const groups = Object.values(
    items.reduce<
      Record<
        string,
        {
          ruleId: string;
          ruleName: string;
          severity: (typeof items)[number]["severity"];
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
  );

  if (view === "trend") {
    return (
      <div>
        <div className="flex h-64 items-end gap-2 border-b border-border px-4">
          {trend.map((value, index) => (
            <div key={index} className="flex-1">
              <div
                className="rounded-t-[var(--radius-sm)] bg-destructive"
                style={{
                  height: `${Math.max(2, (value / maximumTrend) * 208)}px`,
                }}
                title={`${value} violations`}
              />
            </div>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Twelve two-hour periods. Peak: {maximumTrend} violations.
        </p>
      </div>
    );
  }
  if (view === "groups") {
    return (
      <div className="grid gap-3 sm:grid-cols-3">
        {groups.map((group) => (
          <Card key={group.ruleId} className="p-4">
            <Badge tone={group.severity === "critical" ? "danger" : "warning"}>
              {group.severity}
            </Badge>
            <h3 className="mt-3 font-semibold">{group.ruleName}</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              {group.count} visible violation{group.count === 1 ? "" : "s"} ·{" "}
              {[...group.services].join(", ") || "unknown service"}
            </p>
          </Card>
        ))}
      </div>
    );
  }
  if (view === "heatmap") {
    return (
      <div>
        <div
          className="grid grid-cols-12 gap-1"
          role="img"
          aria-label="Violation heatmap across services and time. The strongest concentration is in the review worker."
        >
          {Array.from({ length: 60 }, (_, index) => {
            const serviceIndex = Math.floor(index / 12);
            const bucketIndex = index % 12;
            const services = [
              ...new Set(items.map((item) => item.serviceName)),
            ];
            const count = items.filter((item) => {
              const timestamp = new Date(item.occurredAt).getTime();
              const bucketStart =
                latestTimestamp - (12 - bucketIndex) * 2 * 60 * 60 * 1000;
              return (
                item.serviceName === services[serviceIndex] &&
                timestamp >= bucketStart &&
                timestamp < bucketStart + 2 * 60 * 60 * 1000
              );
            }).length;
            return (
              <span
                key={index}
                className="aspect-square rounded-[3px]"
                style={{
                  background:
                    count === 0
                      ? "var(--surface-subtle)"
                      : `color-mix(in srgb, var(--destructive) ${Math.min(90, 20 + count * 20)}%, var(--surface))`,
                }}
              />
            );
          })}
        </div>
        <p className="mt-3 text-sm text-muted-foreground">
          Cells represent observed violations grouped by service and two-hour
          period.
        </p>
      </div>
    );
  }
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {[
        [
          "Affected workflows",
          new Set(items.map((item) => item.workflowId)).size,
        ],
        [
          "Affected services",
          new Set(items.map((item) => item.serviceName).filter(Boolean)).size,
        ],
        [
          "Critical rules",
          new Set(
            items
              .filter((item) => item.severity === "critical")
              .map((item) => item.ruleId),
          ).size,
        ],
      ].map(([label, value]) => (
        <Card key={label} className="p-5">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
        </Card>
      ))}
    </div>
  );
}
