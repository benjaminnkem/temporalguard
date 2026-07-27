import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { EvidenceGraph } from "./evidence-graph";
import type {
  EvidenceRecord,
  InvestigationRecord,
} from "@/lib/observability-contracts";

const evidence: EvidenceRecord[] = [
  {
    id: "evidence-1",
    investigationId: "investigation-1",
    type: "trace",
    signal: "traces",
    title: "Checkout latency",
    summary: "The checkout span exceeded its expected duration.",
    serviceName: "checkout-api",
    serviceVersion: "2026.07.25",
    traceId: "trace-1",
    reference: null,
    confidence: 0.9,
    createdAt: "2026-07-25T10:00:00.000Z",
  },
];

const investigation: InvestigationRecord = {
  id: "investigation-1",
  violationId: "violation-1",
  workflowId: "workflow-1",
  ruleId: "rule-1",
  status: "completed",
  summary: "Checkout latency increased.",
  confidence: "high",
  topContributor: "checkout-api",
  dataGapCount: 0,
  evidenceCount: 1,
  report: {
    schemaVersion: "1.0",
    summary: "Checkout latency increased.",
    confidence: "high",
    telemetryCompleteness: { score: 1, gaps: [] },
    contributors: [
      {
        rank: 1,
        name: "checkout-api",
        score: 0.9,
        evidenceIds: ["evidence-1"],
      },
    ],
    claims: [
      {
        text: "Checkout latency increased.",
        evidenceIds: ["evidence-1"],
      },
    ],
    noRemediationPerformed: true,
  },
  createdAt: "2026-07-25T10:00:00.000Z",
  updatedAt: "2026-07-25T10:01:00.000Z",
};

describe("EvidenceGraph", () => {
  it("supports keyboard traversal and an equivalent table", () => {
    render(createElement(EvidenceGraph, { investigation, evidence }));

    const nodes = screen.getAllByRole("treeitem");
    nodes[0]?.focus();
    fireEvent.keyDown(nodes[0]!, { key: "ArrowRight" });
    expect(nodes[1]).toHaveFocus();
    fireEvent.keyDown(nodes[1]!, { key: "ArrowLeft" });
    expect(nodes[0]).toHaveFocus();

    expect(
      screen.getByText("Accessible table alternative"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Checkout latency").length).toBeGreaterThan(0);
  });
});
