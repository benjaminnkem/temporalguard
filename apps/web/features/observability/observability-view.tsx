"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Card } from "@/components/ui/surface";
import { observabilityDataSource } from "@/lib/observability-data-source";
import {
  observabilityKeys,
  useConnectionHealth,
  useObservabilityAssets,
  usePlatformHealth,
  useTelemetryQuality,
} from "@/lib/observability-queries";
import { PageIntro, QueryBoundary } from "./shared";
import { formatDate } from "@/lib/utils";

const sections = [
  ["health", "Platform health"],
  ["quality", "Telemetry quality"],
  ["connection", "Connection"],
  ["assets", "Assets"],
] as const;

export function ObservabilityView() {
  const view = useSearchParams().get("view") ?? "health";
  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="Platform operations"
        title="Observability"
        description="Connection health, operational metrics, telemetry completeness, and infrastructure-managed assets."
      />
      <nav aria-label="Observability sections" className="flex flex-wrap gap-2">
        {sections.map(([id, label]) => (
          <Button
            key={id}
            nativeButton={false}
            variant={view === id ? "default" : "outline"}
            render={<Link href={`/observability?view=${id}`} />}
          >
            {label}
          </Button>
        ))}
      </nav>
      {view === "health" ? <HealthPanel /> : null}
      {view === "quality" ? <QualityPanel /> : null}
      {view === "connection" ? <ConnectionPanel /> : null}
      {view === "assets" ? <AssetsPanel /> : null}
    </div>
  );
}

function HealthPanel() {
  const query = usePlatformHealth();
  return (
    <QueryBoundary
      pending={query.isPending}
      error={query.error}
      hasData={Boolean(query.data)}
      retry={() => void query.refetch()}
    >
      {query.data ? (
        <div className="grid gap-4">
          <Card className="flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-xs text-muted-foreground">Current state</p>
              <p className="mt-1 text-xl font-semibold capitalize">
                {query.data.status}
              </p>
            </div>
            <Badge>{formatDate(query.data.generatedAt)}</Badge>
          </Card>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(query.data.metrics).map(([name, value]) => (
              <Card key={name} className="p-4">
                <p className="text-xs text-muted-foreground">
                  {name.replace(/([A-Z])/g, " $1")}
                </p>
                <p className="mt-2 text-2xl font-semibold">{value ?? "—"}</p>
              </Card>
            ))}
          </div>
        </div>
      ) : null}
    </QueryBoundary>
  );
}

function QualityPanel() {
  const query = useTelemetryQuality();
  return (
    <QueryBoundary
      pending={query.isPending}
      error={query.error}
      hasData={Boolean(query.data)}
      empty={!query.isPending && !query.data?.length}
      retry={() => void query.refetch()}
    >
      <div className="grid gap-3 md:grid-cols-2">
        {(query.data ?? []).map((item) => (
          <Card key={item.id} className="p-5">
            <div className="flex items-center justify-between">
              <Badge>{item.scopeType}</Badge>
              <span className="text-2xl font-semibold">
                {Math.round(item.score * (item.score <= 1 ? 100 : 1))}%
              </span>
            </div>
            <h2 className="mt-3 font-medium">{item.scopeKey}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {item.criticalGaps.length
                ? `${item.criticalGaps.length} critical gaps`
                : "No critical gaps"}
            </p>
          </Card>
        ))}
      </div>
    </QueryBoundary>
  );
}

function ConnectionPanel() {
  const query = useConnectionHealth();
  const client = useQueryClient();
  const [form, setForm] = useState({
    name: "primary",
    mode: "self_hosted",
    apiUrl: "",
    uiUrl: "",
    apiKey: "",
  });
  const save = useMutation({
    mutationFn: () => observabilityDataSource.saveConnection(form),
    onSuccess: async () => {
      setForm((value) => ({ ...value, apiKey: "" }));
      await client.invalidateQueries({
        queryKey: observabilityKeys.connection,
      });
    },
  });
  const validate = useMutation({
    mutationFn: observabilityDataSource.validateConnection,
    onSuccess: (data) =>
      client.setQueryData(observabilityKeys.connection, data),
  });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-5">
        <h2 className="font-semibold">Connection status</h2>
        <pre className="mt-4 overflow-x-auto bg-surface-subtle p-4 text-xs">
          {JSON.stringify(query.data ?? { configured: false }, null, 2)}
        </pre>
        <Button
          className="mt-4"
          variant="outline"
          onClick={() => validate.mutate()}
          disabled={validate.isPending}
        >
          Validate connection
        </Button>
      </Card>
      <Card className="p-5">
        <h2 className="font-semibold">Server-side SigNoz connection</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          The key is sent once to TemporalGuard, encrypted at rest, never
          returned, and never used by the browser to call SigNoz.
        </p>
        <div className="mt-4 grid gap-3">
          <Input
            aria-label="Connection name"
            value={form.name}
            onChange={(event) =>
              setForm((value) => ({ ...value, name: event.target.value }))
            }
          />
          <select
            aria-label="Connection mode"
            value={form.mode}
            onChange={(event) =>
              setForm((value) => ({ ...value, mode: event.target.value }))
            }
            className="h-9 border border-input bg-background px-3 text-sm"
          >
            <option value="self_hosted">Self-hosted</option>
            <option value="cloud">Cloud</option>
          </select>
          <Input
            aria-label="SigNoz API URL"
            placeholder="https://signoz.example.com"
            value={form.apiUrl}
            onChange={(event) =>
              setForm((value) => ({ ...value, apiUrl: event.target.value }))
            }
          />
          <Input
            aria-label="SigNoz UI URL"
            placeholder="https://signoz.example.com"
            value={form.uiUrl}
            onChange={(event) =>
              setForm((value) => ({ ...value, uiUrl: event.target.value }))
            }
          />
          <Input
            aria-label="Service-account key"
            type="password"
            autoComplete="new-password"
            value={form.apiKey}
            onChange={(event) =>
              setForm((value) => ({ ...value, apiKey: event.target.value }))
            }
          />
          <Button
            disabled={
              save.isPending || !form.apiUrl || !form.uiUrl || !form.apiKey
            }
            onClick={() => save.mutate()}
          >
            Save encrypted connection
          </Button>
          {save.error ? (
            <p role="alert" className="text-sm text-destructive">
              {save.error.message}
            </p>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

function AssetsPanel() {
  const query = useObservabilityAssets();
  return (
    <QueryBoundary
      pending={query.isPending}
      error={query.error}
      hasData={Boolean(query.data)}
      retry={() => void query.refetch()}
    >
      {query.data ? (
        <div className="grid gap-4 lg:grid-cols-2">
          {[
            ["Dashboards", query.data.dashboards],
            ["Alerts", query.data.alerts],
          ].map(([title, values]) => (
            <Card key={String(title)} className="p-5">
              <h2 className="font-semibold">{title}</h2>
              <ul className="mt-4 grid gap-2 text-sm">
                {(values as string[]).map((value) => (
                  <li
                    key={value}
                    className="flex items-center justify-between border-b border-border py-2"
                  >
                    {value} <Badge>Terraform</Badge>
                  </li>
                ))}
              </ul>
            </Card>
          ))}
        </div>
      ) : null}
    </QueryBoundary>
  );
}
