import { beforeEach, describe, expect, it } from "vitest";
import { MockTemporalGuardDataSource } from "./data-source";

describe("mock event catalogue", () => {
  const source = new MockTemporalGuardDataSource();

  beforeEach(() => localStorage.clear());

  it("creates, persists, and immediately lists custom events", async () => {
    const created = await source.createEvent({
      canonicalName: "invoice.reconciled",
      displayName: "Invoice reconciled",
      domain: "Billing",
      description: "An invoice was reconciled successfully.",
      sourceService: "billing-worker",
      suggestedCorrelationKeys: ["invoice.id"],
      attributes: [],
    });
    const result = await source.listEvents({ search: "invoice.reconciled" });
    expect(result.items[0]?.id).toBe(created.id);
    expect(localStorage.getItem("temporalguard.mock.events.v1")).toContain(
      "invoice.reconciled",
    );
  });

  it("rejects exact duplicates without changing storage", async () => {
    await expect(
      source.createEvent({
        canonicalName: "document.uploaded",
        displayName: "Duplicate",
        domain: "Documents",
        description: "This duplicates an existing event.",
        sourceService: "gateway",
        suggestedCorrelationKeys: ["document.id"],
        attributes: [],
      }),
    ).rejects.toThrow("already exists");
    expect(localStorage.getItem("temporalguard.mock.events.v1")).toBeNull();
  });
});
