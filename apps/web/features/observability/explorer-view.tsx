"use client";

import { ExternalLink, Search } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge, Card } from "@/components/ui/surface";
import { useExplorer } from "@/lib/observability-queries";
import { PageIntro, QueryBoundary } from "./shared";

export function ExplorerView() {
  const params = useSearchParams();
  const router = useRouter();
  const workflowId = params.get("workflow") ?? "";
  const signal = params.get("signal") ?? "traces";
  const query = useExplorer(workflowId, signal);
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`/explorer?${next.toString()}`);
  };
  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="Safe Query Range"
        title="Telemetry explorer"
        description="Server-side, bounded workflow telemetry. Company scope and allowed fields are enforced by the API; raw SQL is not accepted."
      />
      <Card className="grid gap-3 p-4 sm:grid-cols-[minmax(0,1fr)_180px_auto]">
        <label className="relative">
          <span className="sr-only">Workflow ID</span>
          <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Workflow UUID"
            value={workflowId}
            onChange={(event) => update("workflow", event.target.value)}
          />
        </label>
        <select
          aria-label="Telemetry signal"
          value={signal}
          onChange={(event) => update("signal", event.target.value)}
          className="h-9 border border-input bg-background px-3 text-sm"
        >
          <option value="traces">Traces</option>
          <option value="logs">Logs</option>
          <option value="metrics">Metrics</option>
        </select>
        <Button onClick={() => void query.refetch()} disabled={!workflowId}>
          Query
        </Button>
      </Card>
      {!workflowId ? (
        <Card className="grid min-h-48 place-items-center border-dashed p-6 text-center">
          <p className="text-sm text-muted-foreground">
            Enter a workflow UUID to query its correlated telemetry.
          </p>
        </Card>
      ) : (
        <QueryBoundary
          pending={query.isPending}
          error={query.error}
          hasData={Boolean(query.data)}
          empty={!query.isPending && !query.data?.items.length}
          retry={() => void query.refetch()}
        >
          {query.data ? (
            <Card className="p-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Badge>{query.data.signal}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {query.data.items.length} records
                  </span>
                </div>
                {query.data.explorerUrl ? (
                  <Button
                    nativeButton={false}
                    variant="outline"
                    render={
                      <a
                        href={query.data.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                      />
                    }
                  >
                    Open in SigNoz <ExternalLink className="size-4" />
                  </Button>
                ) : null}
              </div>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-xs">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="p-2">Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {query.data.items.map((item, index) => (
                      <tr key={index} className="border-b border-border">
                        <td className="p-2">
                          <pre className="max-w-full whitespace-pre-wrap break-words font-mono">
                            {JSON.stringify(item, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ) : null}
        </QueryBoundary>
      )}
    </div>
  );
}
