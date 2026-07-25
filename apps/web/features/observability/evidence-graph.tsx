"use client";

import { useRef } from "react";
import type {
  EvidenceRecord,
  InvestigationRecord,
} from "@/lib/observability-contracts";
import { Card } from "@/components/ui/surface";

export function EvidenceGraph({
  investigation,
  evidence,
}: {
  investigation: InvestigationRecord;
  evidence: EvidenceRecord[];
}) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);
  const contributors = investigation.report?.contributors ?? [];
  const nodes = [
    ...evidence.map((item) => ({
      id: item.id,
      label: item.title,
      detail: `${item.signal}${item.serviceName ? ` · ${item.serviceName}` : ""}`,
      kind: "evidence",
    })),
    ...contributors.map((item) => ({
      id: `contributor-${item.rank}`,
      label: item.name,
      detail: `Contributor · ${Math.round(item.score * 100)}%`,
      kind: "contributor",
    })),
  ];
  const move = (index: number, direction: number) => {
    if (!nodes.length) return;
    refs.current[(index + direction + nodes.length) % nodes.length]?.focus();
  };
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold">Evidence graph</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Evidence-to-contributor relationships. Use arrow keys to traverse.
          </p>
        </div>
        <span className="text-xs text-muted-foreground">
          {nodes.length} nodes · {evidence.length} citations
        </span>
      </div>
      {nodes.length ? (
        <>
          <div
            role="tree"
            aria-label="Evidence relationship graph"
            className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            {nodes.map((node, index) => (
              <button
                ref={(element) => {
                  refs.current[index] = element;
                }}
                type="button"
                role="treeitem"
                key={node.id}
                onKeyDown={(event) => {
                  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
                    event.preventDefault();
                    move(index, 1);
                  }
                  if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
                    event.preventDefault();
                    move(index, -1);
                  }
                }}
                className="min-h-24 border border-border bg-surface-subtle p-4 text-left outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none"
              >
                <span className="text-[10px] font-semibold uppercase tracking-wider text-primary">
                  {node.kind}
                </span>
                <span className="mt-2 block font-medium">{node.label}</span>
                <span className="mt-1 block text-xs text-muted-foreground">
                  {node.detail}
                </span>
              </button>
            ))}
          </div>
          <details className="mt-5">
            <summary className="cursor-pointer text-sm font-medium">
              Accessible table alternative
            </summary>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="p-2">Node</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Related evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {nodes.map((node) => (
                    <tr key={node.id} className="border-b border-border">
                      <td className="p-2">{node.label}</td>
                      <td className="p-2">{node.kind}</td>
                      <td className="p-2 font-mono text-xs">
                        {node.kind === "contributor"
                          ? contributors
                              .find(
                                (item) =>
                                  `contributor-${item.rank}` === node.id,
                              )
                              ?.evidenceIds.join(", ")
                          : node.id}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      ) : (
        <p className="mt-5 text-sm text-muted-foreground">
          No evidence graph is available yet.
        </p>
      )}
    </Card>
  );
}
