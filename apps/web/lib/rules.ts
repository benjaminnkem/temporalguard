import type { EventDefinition, RuleDraft } from "./contracts";

export function evaluateRule(
  operator: RuleDraft["operator"],
  expected: string[],
  observed: string[],
) {
  if (operator === "any")
    return expected.some((event) => observed.includes(event));
  if (operator === "all")
    return expected.every((event) => observed.includes(event));
  if (operator === "forbid")
    return expected.every((event) => !observed.includes(event));
  let cursor = -1;
  return expected.every((event) => {
    cursor = observed.indexOf(event, cursor + 1);
    return cursor >= 0;
  });
}

export function ruleSentence(draft: RuleDraft) {
  const trigger = draft.trigger?.displayName ?? "a trigger";
  const outcomes =
    draft.outcomes.map((event) => event.displayName).join(", ") ||
    "selected outcomes";
  const verb =
    draft.operator === "forbid" ? "forbid" : `require ${draft.operator}`;
  return `When ${trigger} happens, ${verb} ${outcomes} within ${draft.window.value} ${draft.window.unit}, correlated by ${draft.correlationKey || "an entity key"}.`;
}

function normalizedName(value: string) {
  return value
    .toLowerCase()
    .replace(/(?:ed|ing|s)$/g, "")
    .replace(/[^a-z0-9]/g, "");
}

export function findEventDuplicates(
  canonicalName: string,
  events: EventDefinition[],
) {
  const exact = events.find(
    (event) =>
      event.canonicalName.toLowerCase() === canonicalName.toLowerCase(),
  );
  const near = events.filter(
    (event) =>
      !exact &&
      normalizedName(event.canonicalName) === normalizedName(canonicalName),
  );
  return { exact, near };
}
