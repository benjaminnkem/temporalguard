import { z } from "zod";

export const eventAttributeSchema = z.object({
  key: z.string().min(1),
  label: z.string().min(1),
  type: z.enum([
    "string",
    "number",
    "boolean",
    "timestamp",
    "enum",
    "identifier",
  ]),
  required: z.boolean(),
  sensitive: z.boolean(),
  description: z.string().optional(),
  enumValues: z.array(z.string()).optional(),
});

export const eventDefinitionSchema = z.object({
  id: z.string(),
  canonicalName: z
    .string()
    .regex(
      /^[a-z][a-z0-9]*(?:[._][a-z][a-z0-9]*)+$/,
      "Use lower-case dot notation, for example document.uploaded",
    ),
  displayName: z.string().min(2),
  domain: z.string().min(2),
  description: z.string().min(4),
  sourceService: z.string().optional(),
  suggestedCorrelationKeys: z.array(z.string()),
  attributes: z.array(eventAttributeSchema),
  firstSeenAt: z.string().optional(),
  lastSeenAt: z.string().optional(),
  usageCount: z.number().int().nonnegative(),
  origin: z.enum(["seed", "user", "discovered"]),
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type EventDefinition = z.infer<typeof eventDefinitionSchema>;
export type CreateEventInput = Omit<
  EventDefinition,
  | "id"
  | "firstSeenAt"
  | "lastSeenAt"
  | "usageCount"
  | "origin"
  | "createdAt"
  | "updatedAt"
>;

export const eventReferenceSchema = z.object({
  eventId: z.string(),
  canonicalName: z.string(),
  displayName: z.string(),
});

export const ruleDraftSchema = z
  .object({
    id: z.string().optional(),
    name: z.string().min(3, "Name must contain at least 3 characters"),
    description: z.string().optional(),
    trigger: eventReferenceSchema.nullable(),
    triggerFilters: z.array(
      z.object({
        attribute: z.string(),
        operator: z.enum([
          "equals",
          "not_equals",
          "contains",
          "exists",
          "greater_than",
          "less_than",
        ]),
        value: z.union([z.string(), z.number(), z.boolean()]).optional(),
      }),
    ),
    operator: z.enum(["any", "all", "sequence", "forbid"]),
    outcomes: z
      .array(eventReferenceSchema)
      .min(1, "Select at least one outcome"),
    correlationKey: z.string().min(1, "Select a correlation key"),
    window: z.object({
      value: z.number().positive("Window must be greater than zero"),
      unit: z.enum(["seconds", "minutes", "hours", "days"]),
    }),
    severity: z.enum(["info", "warning", "critical"]),
    environments: z.array(z.string()).min(1),
    status: z.enum(["draft", "active", "paused"]),
  })
  .superRefine((draft, context) => {
    if (!draft.trigger) {
      context.addIssue({
        code: "custom",
        path: ["trigger"],
        message: "Select a trigger event",
      });
    }
    if (draft.operator === "sequence" && draft.outcomes.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["outcomes"],
        message: "A sequence requires at least two outcomes",
      });
    }
    if (
      draft.trigger &&
      draft.outcomes.some((event) => event.eventId === draft.trigger?.eventId)
    ) {
      context.addIssue({
        code: "custom",
        path: ["outcomes"],
        message: "The trigger cannot also be an outcome",
      });
    }
    const ids = draft.outcomes.map((event) => event.eventId);
    if (new Set(ids).size !== ids.length) {
      context.addIssue({
        code: "custom",
        path: ["outcomes"],
        message: "Remove duplicate outcomes",
      });
    }
  });

export type RuleDraft = z.infer<typeof ruleDraftSchema>;

export type RuleSummary = {
  id: string;
  name: string;
  description?: string;
  operator: RuleDraft["operator"];
  severity: RuleDraft["severity"];
  status: RuleDraft["status"];
  triggerEvent: string;
  expectedEvents: string[];
  window: RuleDraft["window"];
  updatedAt: string;
};

export type WorkflowState =
  | "waiting"
  | "near_deadline"
  | "completed"
  | "violated"
  | "recovered";

export type WorkflowSummary = {
  id: string;
  workflowType: string;
  entityId: string;
  ruleId: string;
  ruleName: string;
  state: WorkflowState;
  startedAt: string;
  deadlineAt?: string;
  completedAt?: string;
  lastEventName?: string;
  serviceName?: string;
  environment: string;
  deploymentVersion?: string;
};

export type WorkflowDetail = WorkflowSummary & {
  correlationKey: string;
  correlationValue: string;
  operator: RuleDraft["operator"];
  events: Array<{
    id: string;
    canonicalName: string;
    displayName: string;
    occurredAt: string;
    serviceName?: string;
    traceId?: string;
    spanId?: string;
    attributes: Record<string, unknown>;
  }>;
  expectedSteps: Array<{
    canonicalName: string;
    displayName: string;
    state: "completed" | "current" | "expected" | "missed" | "forbidden_seen";
    occurredAt?: string;
  }>;
  traceId?: string;
  attributes: Record<string, string | number | boolean | null>;
};

export const workflowObservabilityPreviewSchema = z.object({
  configured: z.boolean(),
  signal: z.enum(["traces", "logs", "metrics"]),
  start: z.string(),
  end: z.string(),
  explorerUrl: z.string().url().optional(),
  items: z.array(z.record(z.string(), z.unknown())),
  message: z.string().optional(),
});

export type WorkflowObservabilityPreview = z.infer<
  typeof workflowObservabilityPreviewSchema
>;

export type ViolationSummary = {
  id: string;
  workflowId: string;
  ruleId: string;
  ruleName: string;
  type:
    | "missing_expected_event"
    | "missing_required_events"
    | "out_of_order_event"
    | "forbidden_event_observed"
    | "deadline_exceeded";
  severity: "info" | "warning" | "critical";
  status: "open" | "acknowledged" | "resolved";
  explanation: string;
  triggerEventName: string;
  affectedEventNames: string[];
  lastObservedEventName?: string;
  occurredAt: string;
  overdueMs?: number;
  serviceName?: string;
  environment: string;
  deploymentVersion?: string;
};

export type ViolationDetail = ViolationSummary & {
  expectedCondition: string;
  observedCondition: string;
  correlationKey: string;
  correlationValue: string;
  relatedEvidence: Array<{
    kind: "trace" | "log" | "metric" | "deployment";
    title: string;
    description: string;
    reference?: string;
    confidence?: "low" | "medium" | "high";
  }>;
};

export type DashboardOverview = {
  health: "healthy" | "degraded" | "critical";
  metrics: Array<{
    id: string;
    label: string;
    value: string;
    delta: number;
    favorable: "up" | "down";
    description: string;
  }>;
  reliabilitySeries: Array<{
    timestamp: string;
    volume: number;
    completionRate: number;
    violations: number;
    duration: number;
  }>;
  deadlineBuckets: Array<{ bucket: string; count: number }>;
  recentViolations: ViolationSummary[];
};

export type Paginated<T> = {
  items: T[];
  nextCursor: string | null;
  total?: number;
};
