"use client";

import { ArrowLeft, Download, RefreshCw, Square } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Badge, Card } from "@/components/ui/surface";
import { Button } from "@/components/ui/button";
import { EvidenceGraph } from "./evidence-graph";
import { ConnectivityNotice, PageIntro, QueryBoundary } from "./shared";
import {
  observabilityKeys,
  useInvestigation,
  useInvestigationStream,
} from "@/lib/observability-queries";
import { observabilityDataSource } from "@/lib/observability-data-source";
import { formatDate } from "@/lib/utils";

export function InvestigationDetailView({ id }: { id: string }) {
  const query = useInvestigation(id);
  const router = useRouter();
  const stream = useInvestigationStream(id);
  const client = useQueryClient();
  const cancel = useMutation({
    mutationFn: () => observabilityDataSource.cancelInvestigation(id),
    onSuccess: (value) =>
      client.setQueryData(observabilityKeys.investigation(id), value),
  });
  const rerun = useMutation({
    mutationFn: () => observabilityDataSource.rerunInvestigation(id),
    onSuccess: (value) => router.push(`/investigations/${value.id}`),
  });
  const item = query.data;
  const terminal = item
    ? ["completed", "completed_with_gaps", "cancelled", "dead_letter"].includes(
        item.status,
      )
    : true;
  return (
    <div className="grid gap-6">
      <ConnectivityNotice />
      <Link
        href="/investigations"
        className="inline-flex w-fit items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Investigations
      </Link>
      <PageIntro
        eyebrow="Technical evidence"
        title={item?.summary ?? "Investigation"}
        description="Claims without persisted citations are removed. Telemetry is treated as untrusted input and no remediation is performed."
        actions={
          <div className="flex flex-wrap gap-2">
            <Button
              nativeButton={false}
              variant="outline"
              disabled={!item}
              render={
                <a
                  href={observabilityDataSource.investigationExportUrl(id)}
                  download
                />
              }
            >
              <Download className="size-4" /> Export
            </Button>
            <Button
              variant="outline"
              disabled={rerun.isPending}
              onClick={() => rerun.mutate()}
            >
              <RefreshCw className="size-4" /> Rerun
            </Button>
            <Button
              variant="destructive"
              disabled={terminal || cancel.isPending}
              onClick={() => cancel.mutate()}
            >
              <Square className="size-4" /> Cancel
            </Button>
          </div>
        }
      />
      <QueryBoundary
        pending={query.isPending}
        error={query.error}
        hasData={Boolean(item)}
        retry={() => void query.refetch()}
      >
        {item ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                ["Status", item.status.replaceAll("_", " ")],
                ["Stream", stream],
                ["Confidence", item.confidence ?? "pending"],
                ["Evidence", String(item.evidenceCount)],
              ].map(([label, value]) => (
                <Card key={label} className="p-4">
                  <p className="text-xs text-muted-foreground">{label}</p>
                  <p className="mt-1 font-semibold capitalize">{value}</p>
                </Card>
              ))}
            </div>
            <EvidenceGraph
              investigation={item}
              evidence={item.evidence ?? []}
            />
            <Card className="p-5">
              <h2 className="font-semibold">Cited findings</h2>
              <div className="mt-4 grid gap-3">
                {item.report?.claims.length ? (
                  item.report.claims.map((claim, index) => (
                    <article
                      key={`${claim.text}-${index}`}
                      className="border-l-2 border-primary pl-4"
                    >
                      <p>{claim.text}</p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        Citations:{" "}
                        {claim.evidenceIds.map((evidenceId) => (
                          <a
                            key={evidenceId}
                            href={`#evidence-${evidenceId}`}
                            className="mr-2 font-mono text-primary underline"
                          >
                            {evidenceId.slice(0, 8)}
                          </a>
                        ))}
                      </p>
                    </article>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground">
                    No supported findings are available yet.
                  </p>
                )}
              </div>
            </Card>
            <Card className="p-5">
              <h2 className="font-semibold">Evidence ledger</h2>
              <div className="mt-4 grid gap-3">
                {(item.evidence ?? []).map((evidence) => (
                  <article
                    id={`evidence-${evidence.id}`}
                    key={evidence.id}
                    className="scroll-mt-24 border border-border p-4"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge>{evidence.signal}</Badge>
                      <span className="font-mono text-xs text-muted-foreground">
                        {evidence.id}
                      </span>
                    </div>
                    <h3 className="mt-2 font-medium">{evidence.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {evidence.summary}
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {formatDate(evidence.createdAt)}
                    </p>
                    {evidence.reference ? (
                      <a
                        href={evidence.reference}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm text-primary underline"
                      >
                        Open safe SigNoz reference
                      </a>
                    ) : null}
                  </article>
                ))}
              </div>
            </Card>
          </>
        ) : null}
      </QueryBoundary>
    </div>
  );
}
