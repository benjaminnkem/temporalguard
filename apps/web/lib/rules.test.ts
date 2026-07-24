import { describe, expect, it } from "vitest";
import { eventDefinitionSchema, ruleDraftSchema } from "./contracts";
import { evaluateRule, findEventDuplicates, ruleSentence } from "./rules";

describe("rule operators", () => {
  const expected = ["a", "b"];

  it("implements any", () => {
    expect(evaluateRule("any", expected, ["b"])).toBe(true);
    expect(evaluateRule("any", expected, ["c"])).toBe(false);
  });

  it("implements all without order", () => {
    expect(evaluateRule("all", expected, ["b", "a"])).toBe(true);
    expect(evaluateRule("all", expected, ["a"])).toBe(false);
  });

  it("implements sequence in order", () => {
    expect(evaluateRule("sequence", expected, ["x", "a", "b"])).toBe(true);
    expect(evaluateRule("sequence", expected, ["b", "a"])).toBe(false);
  });

  it("implements forbid", () => {
    expect(evaluateRule("forbid", expected, ["x"])).toBe(true);
    expect(evaluateRule("forbid", expected, ["a"])).toBe(false);
  });
});

describe("rule validation", () => {
  const event = {
    eventId: "evt_a",
    canonicalName: "document.uploaded",
    displayName: "Document uploaded",
  };

  it("blocks sequence rules with fewer than two outcomes", () => {
    const result = ruleDraftSchema.safeParse({
      name: "Sequence rule",
      trigger: event,
      triggerFilters: [],
      operator: "sequence",
      outcomes: [
        {
          eventId: "evt_b",
          canonicalName: "document.scanned",
          displayName: "Document scanned",
        },
      ],
      correlationKey: "document.id",
      window: { value: 10, unit: "minutes" },
      severity: "critical",
      environments: ["production"],
      status: "draft",
    });
    expect(result.success).toBe(false);
  });

  it("formats one readable sentence", () => {
    const draft = ruleDraftSchema.parse({
      name: "Document rule",
      trigger: event,
      triggerFilters: [],
      operator: "any",
      outcomes: [
        {
          eventId: "evt_b",
          canonicalName: "document.scanned",
          displayName: "Document scanned",
        },
      ],
      correlationKey: "document.id",
      window: { value: 10, unit: "minutes" },
      severity: "warning",
      environments: ["production"],
      status: "draft",
    });
    expect(ruleSentence(draft)).toContain(
      "When Document uploaded happens, require any Document scanned",
    );
  });
});

describe("event duplicate detection", () => {
  const event = eventDefinitionSchema.parse({
    id: "evt_a",
    canonicalName: "document.scan_completed",
    displayName: "Scan completed",
    domain: "Documents",
    description: "A document scan completed.",
    suggestedCorrelationKeys: ["document.id"],
    attributes: [],
    usageCount: 1,
    origin: "seed",
    createdAt: "2026-07-24T00:00:00.000Z",
    updatedAt: "2026-07-24T00:00:00.000Z",
  });

  it("detects exact duplicates case-insensitively", () => {
    expect(
      findEventDuplicates("DOCUMENT.SCAN_COMPLETED", [event]).exact?.id,
    ).toBe("evt_a");
  });

  it("detects punctuation-equivalent near duplicates", () => {
    expect(
      findEventDuplicates("document.scan-completed", [event]).near,
    ).toHaveLength(1);
  });
});
