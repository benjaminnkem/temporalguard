"use client";

import { ArrowRight, Radio, Search } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";
import { Badge, Card } from "@/components/ui/surface";
import { Input } from "@/components/ui/input";
import { ConnectivityNotice, PageIntro, QueryBoundary } from "./shared";
import { useInvestigations } from "@/lib/observability-queries";
import { formatDate } from "@/lib/utils";

export function InvestigationsView() {
  const query = useInvestigations();
  const params = useSearchParams();
  const router = useRouter();
  const search = params.get("q") ?? "";
  const status = params.get("status") ?? "all";
  const items = useMemo(
    () =>
      (query.data ?? []).filter(
        (item) =>
          (status === "all" || item.status === status) &&
          (!search ||
            [item.id, item.summary, item.topContributor]
              .filter(Boolean)
              .some((value) =>
                String(value).toLowerCase().includes(search.toLowerCase()),
              )),
      ),
    [query.data, search, status],
  );
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/investigations?${next.toString()}`);
  };
  return (
    <div className="grid gap-6">
      <ConnectivityNotice />
      <PageIntro
        eyebrow="Investigation agent"
        title="Investigations"
        description="Durable, read-only analysis of workflow violations with cited telemetry evidence."
      />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
        <label className="relative">
          <span className="sr-only">Search investigations</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            value={search}
            onChange={(event) => update("q", event.target.value)}
            placeholder="Search ID, summary, or contributor"
          />
        </label>
        <select
          aria-label="Investigation status"
          value={status}
          onChange={(event) => update("status", event.target.value)}
          className="h-9 border border-input bg-background px-3 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="queued">Queued</option>
          <option value="running">Running</option>
          <option value="completed">Completed</option>
          <option value="completed_with_gaps">Completed with gaps</option>
          <option value="failed">Failed</option>
        </select>
      </div>
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        hasData={Boolean(query.data)}
        empty={!query.isPending && items.length === 0}
        retry={() => void query.refetch()}
      >
        <div className="grid gap-3">
          {items.map((item) => (
            <Link
              href={`/investigations/${item.id}`}
              key={item.id}
              className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <Card className="grid gap-4 p-5 transition-colors hover:border-border-strong motion-reduce:transition-none md:grid-cols-[1fr_auto]">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{item.status.replaceAll("_", " ")}</Badge>
                    {["queued", "running"].includes(item.status) ? (
                      <span className="flex items-center gap-1 text-xs text-primary">
                        <Radio className="live-dot size-3 motion-reduce:animate-none" />
                        Live
                      </span>
                    ) : null}
                    <span className="font-mono text-xs text-muted-foreground">
                      {item.id}
                    </span>
                  </div>
                  <h2 className="mt-3 font-semibold">
                    {item.summary ?? "Investigation in progress"}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {item.evidenceCount} evidence records · {item.dataGapCount}{" "}
                    gaps · {formatDate(item.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-sm text-primary">
                  View evidence <ArrowRight className="size-4" />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </QueryBoundary>
    </div>
  );
}
