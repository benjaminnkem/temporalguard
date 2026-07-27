"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge, Card } from "@/components/ui/surface";
import {
  useComparisons,
  useCreateComparison,
  useDeployments,
} from "@/lib/observability-queries";
import { PageIntro, QueryBoundary, percent } from "./shared";
import { formatDate, formatDuration } from "@/lib/utils";

export function ComparisonsView() {
  const query = useComparisons();
  const create = useCreateComparison();
  const deployments = useDeployments();
  const params = useSearchParams();
  const router = useRouter();
  const kind = params.get("kind") ?? "successful_vs_violated";
  const deploymentVersion =
    params.get("version") ?? deployments.data?.[0]?.version ?? "";
  const setKind = (value: string) => {
    const next = new URLSearchParams(params);
    next.set("kind", value);
    router.replace(`/comparisons?${next.toString()}`);
  };
  const setVersion = (value: string) => {
    const next = new URLSearchParams(params);
    next.set("version", value);
    router.replace(`/comparisons?${next.toString()}`);
  };
  return (
    <div className="grid gap-6">
      <PageIntro
        eyebrow="Cohort analysis"
        title="Comparisons"
        description="Compare persisted workflow outcomes, deployment versions, and telemetry completeness without changing production state."
        actions={
          <div className="flex flex-wrap gap-2">
            <select
              aria-label="Comparison type"
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className="h-9 border border-input bg-background px-3 text-sm"
            >
              <option value="successful_vs_violated">
                Successful vs violated
              </option>
              <option value="completed_vs_completed_late">
                Completed vs completed late
              </option>
              <option value="before_vs_after_deployment">
                Before vs after deployment
              </option>
            </select>
            {kind === "before_vs_after_deployment" ? (
              <select
                aria-label="Deployment version"
                value={deploymentVersion}
                onChange={(event) => setVersion(event.target.value)}
                className="h-9 border border-input bg-background px-3 text-sm"
              >
                <option value="">Select deployment version</option>
                {(deployments.data ?? []).map((deployment) => (
                  <option key={deployment.id} value={deployment.version}>
                    {deployment.serviceName} · {deployment.version}
                  </option>
                ))}
              </select>
            ) : null}
            <Button
              disabled={
                create.isPending ||
                (kind === "before_vs_after_deployment" && !deploymentVersion)
              }
              onClick={() =>
                create.mutate({
                  kind,
                  ...(kind === "before_vs_after_deployment"
                    ? { deploymentVersion }
                    : {}),
                })
              }
            >
              Run comparison
            </Button>
          </div>
        }
      />
      {create.error ? (
        <p role="alert" className="text-sm text-destructive">
          {create.error.message}
        </p>
      ) : null}
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        hasData={Boolean(query.data)}
        empty={!query.isPending && !query.data?.length}
        retry={() => void query.refetch()}
      >
        <div className="grid gap-4">
          {(query.data ?? []).map((item) => {
            const result = item.resultSummary;
            return (
              <Card key={item.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Badge>
                      {String(item.configuration.kind ?? "comparison")}
                    </Badge>
                    <h2 className="mt-2 font-semibold">{item.name}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </p>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground">
                    {item.id}
                  </span>
                </div>
                {result ? (
                  <div className="mt-5 overflow-x-auto">
                    <table className="w-full min-w-[620px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-muted-foreground">
                          <th className="p-2">Dimension</th>
                          <th className="p-2">Cohort A</th>
                          <th className="p-2">Cohort B</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          [
                            "Workflows",
                            result.cohortA.count,
                            result.cohortB.count,
                          ],
                          [
                            "Completion rate",
                            percent(result.cohortA.completionRate),
                            percent(result.cohortB.completionRate),
                          ],
                          [
                            "Violation rate",
                            percent(result.cohortA.violationRate),
                            percent(result.cohortB.violationRate),
                          ],
                          [
                            "Median duration",
                            result.cohortA.medianDurationMs
                              ? formatDuration(result.cohortA.medianDurationMs)
                              : "—",
                            result.cohortB.medianDurationMs
                              ? formatDuration(result.cohortB.medianDurationMs)
                              : "—",
                          ],
                        ].map(([label, a, b]) => (
                          <tr
                            key={String(label)}
                            className="border-b border-border"
                          >
                            <th className="p-2 font-medium">{label}</th>
                            <td className="p-2">{a}</td>
                            <td className="p-2">{b}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-muted-foreground">
                    Comparison is still processing.
                  </p>
                )}
              </Card>
            );
          })}
        </div>
      </QueryBoundary>
    </div>
  );
}
