import { beforeEach, describe, expect, it } from "vitest";
import { MockTemporalGuardDataSource } from "./data-source";

describe("mock event catalogue", () => {
  const source = new MockTemporalGuardDataSource();

  beforeEach(async () => {
    localStorage.clear();
    await source.reset();
  });

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

  it("enables, disables, and deletes rules", async () => {
    const created = await source.createRule({
      name: "Payment completion",
      trigger: {
        eventId: "event_payment_authorized",
        canonicalName: "payment.authorized",
        displayName: "Payment authorized",
      },
      triggerFilters: [],
      operator: "all",
      outcomes: [
        {
          eventId: "event_payment_completed",
          canonicalName: "payment.completed",
          displayName: "Payment completed",
        },
      ],
      correlationKey: "payment.id",
      window: { value: 15, unit: "minutes" },
      severity: "critical",
      environments: ["production"],
      status: "active",
    });

    const loaded = await source.getRule(created.id);
    expect(loaded.name).toBe("Payment completion");
    await source.updateRule(created.id, {
      ...loaded,
      name: "Updated payment completion",
    });
    const afterUpdate = await source.listRules();
    expect(
      afterUpdate.items.find((rule) => rule.id === created.id)?.name,
    ).toBe("Updated payment completion");

    expect((await source.setRuleEnabled(created.id, false)).status).toBe(
      "paused",
    );
    expect((await source.setRuleEnabled(created.id, true)).status).toBe(
      "active",
    );

    await source.deleteRule(created.id);
    expect(
      (await source.listRules()).items.find((rule) => rule.id === created.id),
    ).toBeUndefined();
  });
});

