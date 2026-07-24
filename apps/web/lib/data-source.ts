import {
  eventDefinitionSchema,
  ruleDraftSchema,
  type CreateEventInput,
  type DashboardOverview,
  type EventDefinition,
  type Paginated,
  type RuleDraft,
  type RuleSummary,
  type ViolationDetail,
  type ViolationSummary,
  type WorkflowDetail,
  type WorkflowObservabilityPreview,
  type WorkflowSummary,
  workflowObservabilityPreviewSchema,
} from "./contracts";
import { evaluateRule } from "./rules";

export type AnalyticsQuery = {
  environment?: string;
  search?: string;
  state?: string;
  cursor?: string;
};

export interface TemporalGuardDataSource {
  getDashboardOverview(query: AnalyticsQuery): Promise<DashboardOverview>;
  listEvents(query?: AnalyticsQuery): Promise<Paginated<EventDefinition>>;
  createEvent(input: CreateEventInput): Promise<EventDefinition>;
  listRules(query?: AnalyticsQuery): Promise<Paginated<RuleSummary>>;
  getRule(id: string): Promise<RuleDraft>;
  createRule(input: RuleDraft): Promise<RuleSummary>;
  updateRule(id: string, input: RuleDraft): Promise<RuleSummary>;
  setRuleEnabled(id: string, enabled: boolean): Promise<RuleSummary>;
  deleteRule(id: string): Promise<void>;
  listWorkflows(query?: AnalyticsQuery): Promise<Paginated<WorkflowSummary>>;
  getWorkflow(id: string): Promise<WorkflowDetail>;
  getWorkflowTraces(id: string): Promise<WorkflowObservabilityPreview>;
  getWorkflowLogs(id: string): Promise<WorkflowObservabilityPreview>;
  getWorkflowMetrics(id: string): Promise<WorkflowObservabilityPreview>;
  listViolations(query?: AnalyticsQuery): Promise<Paginated<ViolationSummary>>;
  getViolation(id: string): Promise<ViolationDetail>;
  testRule(input: RuleDraft): Promise<{
    evaluatedCount: number;
    completedCount: number;
    violatedCount: number;
    openCount: number;
    medianCompletionMs: number;
    dataMode: "mock" | "api";
  }>;
  reset(): Promise<void>;
}

const FIXED_NOW = "2026-07-24T08:00:00.000Z";

const seedEventInputs: Array<[string, string, string, string, number]> = [
  ["document.uploaded", "Document uploaded", "Documents", "gateway", 84],
  [
    "document.scan_completed",
    "Virus scan completed",
    "Documents",
    "scanner",
    76,
  ],
  [
    "document.verification_completed",
    "Verification completed",
    "Documents",
    "verification",
    62,
  ],
  [
    "application.submitted",
    "Application submitted",
    "Applications",
    "applications-api",
    120,
  ],
  ["review.completed", "Review completed", "Applications", "review-worker", 91],
  ["decision.issued", "Decision issued", "Applications", "decisions", 88],
  [
    "employee.offboarding_started",
    "Offboarding started",
    "Identity",
    "people-service",
    34,
  ],
  [
    "access.email_revoked",
    "Email access revoked",
    "Identity",
    "identity-worker",
    30,
  ],
  [
    "access.cloud_revoked",
    "Cloud access revoked",
    "Identity",
    "identity-worker",
    27,
  ],
  ["consent.withdrawn", "Consent withdrawn", "Privacy", "consent-api", 48],
  [
    "marketing_data.processed",
    "Marketing data processed",
    "Privacy",
    "campaign-worker",
    42,
  ],
  ["video.uploaded", "Video uploaded", "Media", "media-api", 56],
  ["video.scan_completed", "Video scan completed", "Media", "scanner", 51],
  ["video.transcoded", "Video transcoded", "Media", "transcoder", 49],
  ["video.published", "Video published", "Media", "publishing-api", 46],
];

const seedEvents: EventDefinition[] = seedEventInputs.map(
  ([canonicalName, displayName, domain, sourceService, usageCount], index) =>
    eventDefinitionSchema.parse({
      id: `evt_${String(index + 1).padStart(3, "0")}`,
      canonicalName,
      displayName,
      domain,
      description: `${displayName} emitted by the ${sourceService} service.`,
      sourceService,
      suggestedCorrelationKeys: [
        canonicalName.startsWith("document")
          ? "document.id"
          : canonicalName.startsWith("application")
            ? "application.id"
            : canonicalName.startsWith("access") ||
                canonicalName.startsWith("employee")
              ? "employee.id"
              : "workflow.id",
      ],
      attributes: [
        {
          key: "entity.id",
          label: "Entity ID",
          type: "identifier",
          required: true,
          sensitive: false,
        },
      ],
      firstSeenAt: "2026-06-01T08:00:00.000Z",
      lastSeenAt: FIXED_NOW,
      usageCount,
      origin: "seed",
      createdAt: "2026-06-01T08:00:00.000Z",
      updatedAt: FIXED_NOW,
    }),
);

const workflows: WorkflowDetail[] = [
  {
    id: "wf_doc_9021",
    workflowType: "Document verification",
    entityId: "doc_9021",
    ruleId: "rule_doc",
    ruleName: "Documents verified within 10m",
    state: "near_deadline",
    startedAt: "2026-07-24T07:52:00.000Z",
    deadlineAt: "2026-07-24T08:02:00.000Z",
    lastEventName: "document.scan_completed",
    serviceName: "scanner",
    environment: "production",
    deploymentVersion: "scanner@2.8.1",
    correlationKey: "document.id",
    correlationValue: "doc_9021",
    operator: "all",
    traceId: "f65e9d0a41b94734b9fd93ce0b132b44",
    events: [
      {
        id: "log_1",
        canonicalName: "document.uploaded",
        displayName: "Document uploaded",
        occurredAt: "2026-07-24T07:52:00.000Z",
        serviceName: "gateway",
        attributes: { "document.id": "doc_9021", region: "eu-west-1" },
      },
      {
        id: "log_2",
        canonicalName: "document.scan_completed",
        displayName: "Virus scan completed",
        occurredAt: "2026-07-24T07:56:10.000Z",
        serviceName: "scanner",
        attributes: { "document.id": "doc_9021", result: "clean" },
      },
    ],
    expectedSteps: [
      {
        canonicalName: "document.uploaded",
        displayName: "Document uploaded",
        state: "completed",
        occurredAt: "2026-07-24T07:52:00.000Z",
      },
      {
        canonicalName: "document.scan_completed",
        displayName: "Virus scan completed",
        state: "completed",
        occurredAt: "2026-07-24T07:56:10.000Z",
      },
      {
        canonicalName: "document.verification_completed",
        displayName: "Verification completed",
        state: "current",
      },
    ],
    attributes: {
      region: "eu-west-1",
      customerTier: "enterprise",
      fileType: "pdf",
    },
  },
  {
    id: "wf_app_4210",
    workflowType: "Application decision",
    entityId: "app_4210",
    ruleId: "rule_application",
    ruleName: "Decision issued within 4h",
    state: "violated",
    startedAt: "2026-07-24T01:15:00.000Z",
    deadlineAt: "2026-07-24T05:15:00.000Z",
    lastEventName: "review.completed",
    serviceName: "review-worker",
    environment: "production",
    deploymentVersion: "review-worker@5.4.0",
    correlationKey: "application.id",
    correlationValue: "app_4210",
    operator: "sequence",
    traceId: "4f10ae90d9e24c39a7f8aefccaa84122",
    events: [
      {
        id: "log_3",
        canonicalName: "application.submitted",
        displayName: "Application submitted",
        occurredAt: "2026-07-24T01:15:00.000Z",
        serviceName: "applications-api",
        attributes: { "application.id": "app_4210", region: "ng-west" },
      },
      {
        id: "log_4",
        canonicalName: "review.completed",
        displayName: "Review completed",
        occurredAt: "2026-07-24T04:55:00.000Z",
        serviceName: "review-worker",
        attributes: { "application.id": "app_4210", outcome: "approved" },
      },
    ],
    expectedSteps: [
      {
        canonicalName: "application.submitted",
        displayName: "Application submitted",
        state: "completed",
        occurredAt: "2026-07-24T01:15:00.000Z",
      },
      {
        canonicalName: "review.completed",
        displayName: "Review completed",
        state: "completed",
        occurredAt: "2026-07-24T04:55:00.000Z",
      },
      {
        canonicalName: "decision.issued",
        displayName: "Decision issued",
        state: "missed",
      },
    ],
    attributes: { region: "ng-west", product: "business-credit" },
  },
  {
    id: "wf_privacy_188",
    workflowType: "Consent enforcement",
    entityId: "customer_188",
    ruleId: "rule_privacy",
    ruleName: "No processing after withdrawal",
    state: "violated",
    startedAt: "2026-07-23T22:10:00.000Z",
    deadlineAt: "2026-07-24T22:10:00.000Z",
    lastEventName: "marketing_data.processed",
    serviceName: "campaign-worker",
    environment: "production",
    deploymentVersion: "campaign-worker@3.11.2",
    correlationKey: "customer.id",
    correlationValue: "customer_188",
    operator: "forbid",
    events: [
      {
        id: "log_5",
        canonicalName: "consent.withdrawn",
        displayName: "Consent withdrawn",
        occurredAt: "2026-07-23T22:10:00.000Z",
        serviceName: "consent-api",
        attributes: { "customer.id": "customer_188" },
      },
      {
        id: "log_6",
        canonicalName: "marketing_data.processed",
        displayName: "Marketing data processed",
        occurredAt: "2026-07-24T06:24:00.000Z",
        serviceName: "campaign-worker",
        attributes: { "customer.id": "customer_188", campaign: "renewal" },
      },
    ],
    expectedSteps: [
      {
        canonicalName: "consent.withdrawn",
        displayName: "Consent withdrawn",
        state: "completed",
        occurredAt: "2026-07-23T22:10:00.000Z",
      },
      {
        canonicalName: "marketing_data.processed",
        displayName: "Marketing data processed",
        state: "forbidden_seen",
        occurredAt: "2026-07-24T06:24:00.000Z",
      },
    ],
    attributes: { region: "ng-west", campaign: "renewal" },
  },
  {
    id: "wf_video_551",
    workflowType: "Video publishing",
    entityId: "video_551",
    ruleId: "rule_video",
    ruleName: "Video publish sequence",
    state: "completed",
    startedAt: "2026-07-24T06:44:00.000Z",
    completedAt: "2026-07-24T07:02:00.000Z",
    deadlineAt: "2026-07-24T07:14:00.000Z",
    lastEventName: "video.published",
    serviceName: "publishing-api",
    environment: "staging",
    deploymentVersion: "publishing-api@1.8.0",
    correlationKey: "video.id",
    correlationValue: "video_551",
    operator: "sequence",
    events: [
      {
        id: "log_7",
        canonicalName: "video.uploaded",
        displayName: "Video uploaded",
        occurredAt: "2026-07-24T06:44:00.000Z",
        serviceName: "media-api",
        attributes: { "video.id": "video_551" },
      },
      {
        id: "log_8",
        canonicalName: "video.published",
        displayName: "Video published",
        occurredAt: "2026-07-24T07:02:00.000Z",
        serviceName: "publishing-api",
        attributes: { "video.id": "video_551" },
      },
    ],
    expectedSteps: [
      {
        canonicalName: "video.uploaded",
        displayName: "Video uploaded",
        state: "completed",
      },
      {
        canonicalName: "video.scan_completed",
        displayName: "Video scan completed",
        state: "completed",
      },
      {
        canonicalName: "video.transcoded",
        displayName: "Video transcoded",
        state: "completed",
      },
      {
        canonicalName: "video.published",
        displayName: "Video published",
        state: "completed",
      },
    ],
    attributes: { region: "eu-central", codec: "h264" },
  },
];

const violations: ViolationDetail[] = [
  {
    id: "vio_1204",
    workflowId: "wf_app_4210",
    ruleId: "rule_application",
    ruleName: "Decision issued within 4h",
    type: "missing_expected_event",
    severity: "critical",
    status: "open",
    explanation: "Decision issued was not observed before the 4-hour deadline.",
    triggerEventName: "application.submitted",
    affectedEventNames: ["decision.issued"],
    lastObservedEventName: "review.completed",
    occurredAt: "2026-07-24T05:15:00.000Z",
    overdueMs: 9_900_000,
    serviceName: "review-worker",
    environment: "production",
    deploymentVersion: "review-worker@5.4.0",
    expectedCondition: "Review completed then decision issued within 4 hours.",
    observedCondition:
      "Review completed after 3h 40m; decision issued was not observed.",
    correlationKey: "application.id",
    correlationValue: "app_4210",
    relatedEvidence: [
      {
        kind: "deployment",
        title: "review-worker@5.4.0 deployed",
        description:
          "Deployment occurred 18 minutes before the increase in delayed decisions.",
        confidence: "medium",
      },
      {
        kind: "trace",
        title: "Review completion trace",
        description:
          "Correlated trace includes a downstream decision queue publish.",
        reference: "4f10ae90d9e24c39a7f8aefccaa84122",
        confidence: "medium",
      },
    ],
  },
  {
    id: "vio_1203",
    workflowId: "wf_privacy_188",
    ruleId: "rule_privacy",
    ruleName: "No processing after withdrawal",
    type: "forbidden_event_observed",
    severity: "critical",
    status: "acknowledged",
    explanation:
      "Marketing data was processed after consent had been withdrawn.",
    triggerEventName: "consent.withdrawn",
    affectedEventNames: ["marketing_data.processed"],
    lastObservedEventName: "marketing_data.processed",
    occurredAt: "2026-07-24T06:24:00.000Z",
    serviceName: "campaign-worker",
    environment: "production",
    deploymentVersion: "campaign-worker@3.11.2",
    expectedCondition:
      "Marketing data processing must not happen after withdrawal.",
    observedCondition:
      "marketing_data.processed occurred 8h 14m after consent.withdrawn.",
    correlationKey: "customer.id",
    correlationValue: "customer_188",
    relatedEvidence: [
      {
        kind: "log",
        title: "Campaign worker eligibility log",
        description:
          "A correlated log shows a stale consent cache result. This is supporting evidence, not proven causation.",
        confidence: "high",
      },
    ],
  },
  {
    id: "vio_1198",
    workflowId: "wf_doc_9021",
    ruleId: "rule_doc",
    ruleName: "Documents verified within 10m",
    type: "deadline_exceeded",
    severity: "warning",
    status: "resolved",
    explanation:
      "A similar document verification exceeded its deadline by 2m 18s.",
    triggerEventName: "document.uploaded",
    affectedEventNames: ["document.verification_completed"],
    lastObservedEventName: "document.scan_completed",
    occurredAt: "2026-07-24T04:42:00.000Z",
    overdueMs: 138_000,
    serviceName: "verification",
    environment: "production",
    deploymentVersion: "verification@4.9.3",
    expectedCondition: "Scan and verification complete within 10 minutes.",
    observedCondition: "Verification completed after 12m 18s.",
    correlationKey: "document.id",
    correlationValue: "doc_8890",
    relatedEvidence: [],
  },
];

const storageKey = "temporalguard.mock.events.v1";

function loadCustomEvents() {
  if (typeof window === "undefined") return [];
  try {
    const raw: unknown = JSON.parse(localStorage.getItem(storageKey) ?? "[]");
    return eventDefinitionSchema.array().parse(raw);
  } catch {
    localStorage.removeItem(storageKey);
    return [];
  }
}

const delay = (milliseconds = 180) =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export class MockTemporalGuardDataSource implements TemporalGuardDataSource {
  private mockRules: RuleSummary[] = [];
  private mockRuleDrafts = new Map<string, RuleDraft>();

  async getDashboardOverview(query: AnalyticsQuery) {
    await delay();
    if (query.state === "error") throw new Error("Mock dashboard failure");
    const visibleViolations =
      query.environment && query.environment !== "all"
        ? violations.filter(
            (violation) => violation.environment === query.environment,
          )
        : violations;
    return {
      health: "degraded" as const,
      metrics: [
        {
          id: "health",
          label: "Workflow health",
          value: "Degraded",
          delta: -4.2,
          favorable: "up" as const,
          description: "Composite completion and deadline health.",
        },
        {
          id: "completion",
          label: "Completion rate",
          value: "96.8%",
          delta: 1.4,
          favorable: "up" as const,
          description: "Completed workflows divided by started workflows.",
        },
        {
          id: "active",
          label: "Active",
          value: "1,284",
          delta: 8.1,
          favorable: "up" as const,
          description: "Open workflows inside their evaluation window.",
        },
        {
          id: "deadline",
          label: "Near deadline",
          value: "47",
          delta: 12.4,
          favorable: "down" as const,
          description: "Open workflows with less than 15 minutes remaining.",
        },
        {
          id: "violations",
          label: "Violations",
          value: "18",
          delta: -18.2,
          favorable: "down" as const,
          description: "Rules violated in the selected period.",
        },
        {
          id: "median",
          label: "Median / p95",
          value: "3.4m / 18.7m",
          delta: -6.3,
          favorable: "down" as const,
          description: "Median and p95 workflow completion duration.",
        },
      ],
      reliabilitySeries: Array.from({ length: 12 }, (_, index) => ({
        timestamp: `${String(index * 2).padStart(2, "0")}:00`,
        volume: 760 + ((index * 83) % 310),
        completionRate: 94 + ((index * 17) % 45) / 10,
        violations: 4 + ((index * 7) % 10),
        duration: 180 + ((index * 41) % 260),
      })),
      deadlineBuckets: [
        { bucket: "< 5m", count: 12 },
        { bucket: "< 15m", count: 35 },
        { bucket: "< 1h", count: 84 },
        { bucket: "Overdue", count: 18 },
      ],
      recentViolations: query.state === "empty" ? [] : visibleViolations,
    };
  }

  async listEvents(query: AnalyticsQuery = {}) {
    await delay(80);
    const search = query.search?.trim().toLowerCase();
    const items = [...loadCustomEvents(), ...seedEvents]
      .filter((event) =>
        search
          ? [
              event.canonicalName,
              event.displayName,
              event.domain,
              event.description,
              event.sourceService,
              ...event.attributes.map((attribute) => attribute.key),
            ].some((value) => value?.toLowerCase().includes(search))
          : true,
      )
      .sort((a, b) => b.usageCount - a.usageCount);
    return { items, nextCursor: null, total: items.length };
  }

  async createEvent(input: CreateEventInput) {
    await delay(260);
    const parsed = eventDefinitionSchema
      .omit({
        id: true,
        firstSeenAt: true,
        lastSeenAt: true,
        usageCount: true,
        origin: true,
        createdAt: true,
        updatedAt: true,
      })
      .parse(input);
    const all = [...loadCustomEvents(), ...seedEvents];
    if (
      all.some(
        (event) =>
          event.canonicalName.toLowerCase() ===
          parsed.canonicalName.toLowerCase(),
      )
    ) {
      throw new Error("An event with this canonical name already exists.");
    }
    const event = eventDefinitionSchema.parse({
      ...parsed,
      id: `evt_custom_${parsed.canonicalName.replaceAll(".", "_")}`,
      usageCount: 0,
      origin: "user",
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
    localStorage.setItem(
      storageKey,
      JSON.stringify([event, ...loadCustomEvents()]),
    );
    return event;
  }

  async listRules() {
    await delay();
    return {
      items: this.mockRules,
      nextCursor: null,
      total: this.mockRules.length,
    };
  }

  async createRule(input: RuleDraft) {
    await delay();
    const rule = {
      id: input.id ?? "rule_mock",
      name: input.name,
      description: input.description,
      operator: input.operator,
      severity: input.severity,
      status: input.status,
      triggerEvent: input.trigger?.canonicalName ?? "",
      expectedEvents: input.outcomes.map((outcome) => outcome.canonicalName),
      window: input.window,
      updatedAt: FIXED_NOW,
    };
    this.mockRules = [
      rule,
      ...this.mockRules.filter((item) => item.id !== rule.id),
    ];
    this.mockRuleDrafts.set(rule.id, { ...input, id: rule.id });
    return rule;
  }

  async getRule(id: string) {
    await delay();
    const rule = this.mockRuleDrafts.get(id);
    if (!rule) throw new Error("Rule not found");
    return rule;
  }

  async updateRule(id: string, input: RuleDraft) {
    await delay();
    if (!this.mockRuleDrafts.has(id)) throw new Error("Rule not found");
    this.mockRuleDrafts.set(id, { ...input, id });
    const updated: RuleSummary = {
      id,
      name: input.name,
      description: input.description,
      operator: input.operator,
      severity: input.severity,
      status: input.status,
      triggerEvent: input.trigger?.canonicalName ?? "",
      expectedEvents: input.outcomes.map((outcome) => outcome.canonicalName),
      window: input.window,
      updatedAt: new Date().toISOString(),
    };
    this.mockRules = this.mockRules.map((item) =>
      item.id === id ? updated : item,
    );
    return updated;
  }

  async setRuleEnabled(id: string, enabled: boolean) {
    await delay();
    const rule = this.mockRules.find((item) => item.id === id);
    if (!rule) throw new Error("Rule not found");
    const updated: RuleSummary = {
      ...rule,
      status: enabled ? "active" : "paused",
      updatedAt: new Date().toISOString(),
    };
    this.mockRules = this.mockRules.map((item) =>
      item.id === id ? updated : item,
    );
    const draft = this.mockRuleDrafts.get(id);
    if (draft) {
      this.mockRuleDrafts.set(id, {
        ...draft,
        status: enabled ? "active" : "paused",
      });
    }
    return updated;
  }

  async deleteRule(id: string) {
    await delay();
    if (!this.mockRules.some((item) => item.id === id)) {
      throw new Error("Rule not found");
    }
    this.mockRules = this.mockRules.filter((item) => item.id !== id);
    this.mockRuleDrafts.delete(id);
  }

  async listWorkflows(query: AnalyticsQuery = {}) {
    await delay();
    if (query.state === "error") throw new Error("Mock workflow failure");
    const search = query.search?.toLowerCase();
    const items = workflows.filter(
      (workflow) =>
        (!query.environment ||
          query.environment === "all" ||
          workflow.environment === query.environment) &&
        (!query.state ||
          ["all", "error"].includes(query.state) ||
          workflow.state === query.state) &&
        (!search ||
          [
            workflow.id,
            workflow.workflowType,
            workflow.ruleName,
            workflow.serviceName,
            workflow.entityId,
          ].some((value) => value?.toLowerCase().includes(search))),
    );
    return {
      items,
      nextCursor: query.cursor ? null : "cursor_next",
      total: items.length,
    };
  }

  async getWorkflow(id: string) {
    await delay();
    const workflow = workflows.find((item) => item.id === id);
    if (!workflow) throw new Error("Workflow not found");
    return workflow;
  }

  async getWorkflowTraces(id: string) {
    const workflow = await this.getWorkflow(id);
    return this.mockObservabilityPreview(workflow, "traces");
  }

  async getWorkflowLogs(id: string) {
    const workflow = await this.getWorkflow(id);
    return this.mockObservabilityPreview(workflow, "logs");
  }

  async getWorkflowMetrics(id: string) {
    const workflow = await this.getWorkflow(id);
    return this.mockObservabilityPreview(workflow, "metrics");
  }

  private mockObservabilityPreview(
    workflow: WorkflowDetail,
    signal: WorkflowObservabilityPreview["signal"],
  ): WorkflowObservabilityPreview {
    const items =
      signal === "metrics"
        ? [
            { metric: "observed_events", value: workflow.events.length },
            {
              metric: "expected_steps",
              value: workflow.expectedSteps.length,
            },
          ]
        : workflow.events.map((event) => ({
            timestamp: event.occurredAt,
            event_name: event.canonicalName,
            trace_id: event.traceId,
            span_id: event.spanId,
            ...event.attributes,
          }));
    return {
      configured: true,
      signal,
      start: workflow.startedAt,
      end: workflow.completedAt ?? new Date().toISOString(),
      items,
    };
  }

  async listViolations(query: AnalyticsQuery = {}) {
    await delay();
    if (query.state === "error") throw new Error("Mock violations failure");
    const search = query.search?.toLowerCase();
    const items = violations.filter(
      (violation) =>
        (!query.environment ||
          query.environment === "all" ||
          violation.environment === query.environment) &&
        (!search ||
          [
            violation.id,
            violation.ruleName,
            violation.explanation,
            violation.serviceName,
          ].some((value) => value?.toLowerCase().includes(search))),
    );
    return { items, nextCursor: null, total: items.length };
  }

  async getViolation(id: string) {
    await delay();
    const violation = violations.find((item) => item.id === id);
    if (!violation) throw new Error("Violation not found");
    return violation;
  }

  async testRule(input: RuleDraft) {
    await delay(450);
    const expected = input.outcomes.map((outcome) => outcome.canonicalName);
    const samples = workflows.map((workflow) =>
      workflow.events.map((event) => event.canonicalName),
    );
    const completedCount = samples.filter((sample) =>
      evaluateRule(input.operator, expected, sample),
    ).length;
    return {
      evaluatedCount: 248,
      completedCount: 221 + completedCount,
      violatedCount: 17 - Math.min(completedCount, 4),
      openCount: 10,
      medianCompletionMs: 244_000,
      dataMode: "mock" as const,
    };
  }

  async reset() {
    localStorage.removeItem(storageKey);
    this.mockRules = [];
    this.mockRuleDrafts.clear();
  }
}

type ApiRule = {
  id: string;
  name: string;
  triggerEvent?: string;
  expectedEvents?: string[];
  operator: RuleDraft["operator"];
  description?: string;
  severity?: "low" | "medium" | "high" | "critical";
  timeoutValue?: number;
  timeoutUnit?: RuleDraft["window"]["unit"];
  enabled?: boolean;
  triggerFilters?: RuleDraft["triggerFilters"];
  correlationKey?: string;
  environments?: string[];
  updatedAt?: string;
  triggerEventDefinition?: ApiEvent;
  expectedEventDefinitions?: ApiEvent[];
};

type ApiWorkflow = {
  id: string;
  externalId?: string | null;
  name?: string | null;
  status: "waiting" | "completed" | "overdue" | "cancelled";
  deadline: string;
  currentState?: Record<string, unknown>;
  metadata?: Record<string, unknown> | null;
  ruleId: string;
  rule?: ApiRule;
  externalWorkflow?: {
    externalId: string;
    eventLogs?: Array<{
      id: string;
      eventId: string;
      timestamp: string;
      payload?: Record<string, unknown> | null;
      traceId?: string | null;
      spanId?: string | null;
      event: ApiEvent;
    }>;
  } | null;
  createdAt: string;
  updatedAt: string;
};

type ApiViolation = {
  id: string;
  workflowId: string;
  ruleId: string;
  severity: "low" | "medium" | "high" | "critical";
  reason: string;
  occurredAt: string;
  details?: Record<string, unknown> | null;
  workflow?: ApiWorkflow;
  rule?: ApiRule;
};

type ApiEvent = {
  id: string;
  name: string;
  description?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
};

export class HttpTemporalGuardDataSource implements TemporalGuardDataSource {
  private readonly baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000/api";

  private async request<T>(
    path: string,
    init?: RequestInit,
    retryAfterRefresh = true,
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 15_000);
    try {
      const response = await fetch(`${this.baseUrl}${path}`, {
        ...init,
        credentials: "include",
        signal: init?.signal ?? controller.signal,
        headers: {
          accept: "application/json",
          ...(init?.body ? { "content-type": "application/json" } : {}),
          ...init?.headers,
        },
      });
      if (response.status === 401 && retryAfterRefresh) {
        const refreshed = await fetch(`${this.baseUrl}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (refreshed.ok) return this.request<T>(path, init, false);
      }
      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          code?: string;
          message?: string;
        } | null;
        throw new Error(
          payload?.message ??
            payload?.code ??
            `Request failed (${response.status})`,
        );
      }
      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private query(path: string, query: AnalyticsQuery) {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value && value !== "all") params.set(key, value);
    });
    const serialized = params.toString();
    return serialized ? `${path}?${serialized}` : path;
  }

  getDashboardOverview(query: AnalyticsQuery) {
    return this.request<DashboardOverview>(
      this.query("/dashboard/overview", query),
    );
  }

  async listEvents(query: AnalyticsQuery = {}) {
    const events = await this.request<ApiEvent[]>(this.query("/events", query));
    const search = query.search?.trim().toLowerCase();
    const items = events
      .map((event) => this.mapEvent(event))
      .filter((event) =>
        search
          ? [
              event.canonicalName,
              event.displayName,
              event.domain,
              event.description,
              event.sourceService,
            ].some((value) => value?.toLowerCase().includes(search))
          : true,
      );
    return { items, nextCursor: null, total: items.length };
  }

  async createEvent(input: CreateEventInput) {
    const event = await this.request<ApiEvent>("/events", {
      method: "POST",
      body: JSON.stringify({
        name: input.canonicalName,
        description: input.description,
        metadata: {
          displayName: input.displayName,
          domain: input.domain,
          sourceService: input.sourceService,
          suggestedCorrelationKeys: input.suggestedCorrelationKeys,
          attributes: input.attributes,
          origin: "user",
        },
      }),
    });
    return this.mapEvent(event);
  }

  async listRules(query: AnalyticsQuery = {}) {
    const rules = await this.request<ApiRule[]>(this.query("/rules", query));
    const search = query.search?.trim().toLowerCase();
    const items = rules
      .map((rule) => this.mapRule(rule))
      .filter((rule) =>
        search ? rule.name.toLowerCase().includes(search) : true,
      );
    return { items, nextCursor: null, total: items.length };
  }

  async getRule(id: string) {
    const rule = await this.request<ApiRule>(
      `/rules/${encodeURIComponent(id)}`,
    );
    return this.mapRuleDraft(rule);
  }

  async createRule(input: RuleDraft) {
    const rule = await this.request<ApiRule>("/rules", {
      method: "POST",
      body: JSON.stringify(this.rulePayload(input)),
    });
    return this.mapRule(rule);
  }

  async updateRule(id: string, input: RuleDraft) {
    const rule = await this.request<ApiRule>(
      `/rules/${encodeURIComponent(id)}`,
      {
        method: "PATCH",
        body: JSON.stringify(this.rulePayload(input)),
      },
    );
    return this.mapRule(rule);
  }

  async setRuleEnabled(id: string, enabled: boolean) {
    const rule = await this.request<ApiRule>(
      `/rules/${encodeURIComponent(id)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ enabled }),
      },
    );
    return this.mapRule(rule);
  }

  async deleteRule(id: string) {
    await this.request<void>(`/rules/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  async listWorkflows(query: AnalyticsQuery = {}) {
    const workflows = await this.request<ApiWorkflow[]>(
      this.query("/workflows", query),
    );
    const search = query.search?.trim().toLowerCase();
    const items = workflows
      .map((workflow) => this.mapWorkflow(workflow))
      .filter(
        (workflow) =>
          (!query.environment ||
            query.environment === "all" ||
            workflow.environment === query.environment) &&
          (!query.state ||
            query.state === "all" ||
            workflow.state === query.state) &&
          (!search ||
            [
              workflow.id,
              workflow.workflowType,
              workflow.entityId,
              workflow.ruleName,
            ].some((value) => value.toLowerCase().includes(search))),
      );
    return { items, nextCursor: null, total: items.length };
  }

  async getWorkflow(id: string) {
    const workflow = await this.request<ApiWorkflow>(`/workflows/${id}`);
    return this.mapWorkflowDetail(workflow);
  }

  async getWorkflowTraces(id: string) {
    return this.getWorkflowObservability(id, "traces");
  }

  async getWorkflowLogs(id: string) {
    return this.getWorkflowObservability(id, "logs");
  }

  async getWorkflowMetrics(id: string) {
    return this.getWorkflowObservability(id, "metrics");
  }

  async listViolations(query: AnalyticsQuery = {}) {
    const violations = await this.request<ViolationSummary[]>(
      this.query("/dashboard/violations", query),
    );
    const search = query.search?.trim().toLowerCase();
    const items = violations.filter(
      (violation) =>
        (!query.environment ||
          query.environment === "all" ||
          violation.environment === query.environment) &&
        (!search ||
          [violation.id, violation.ruleName, violation.explanation].some(
            (value) => value.toLowerCase().includes(search),
          )),
    );
    return { items, nextCursor: null, total: items.length };
  }

  async getViolation(id: string) {
    const violation = await this.request<ApiViolation>(`/violations/${id}`);
    return this.mapViolation(violation);
  }

  testRule(input: RuleDraft) {
    return this.request<{
      evaluatedCount: number;
      completedCount: number;
      violatedCount: number;
      openCount: number;
      medianCompletionMs: number;
      dataMode: "api";
    }>("/rules/test", {
      method: "POST",
      body: JSON.stringify({
        trigger: input.trigger,
        operator: input.operator,
        outcomes: input.outcomes,
      }),
    });
  }

  async reset() {
    await Promise.resolve();
  }

  private async getWorkflowObservability(
    id: string,
    signal: WorkflowObservabilityPreview["signal"],
  ) {
    const response = await this.request<unknown>(
      `/workflows/${encodeURIComponent(id)}/observability/${signal}`,
    );
    return workflowObservabilityPreviewSchema.parse(response);
  }

  private mapEvent(event: ApiEvent): EventDefinition {
    const metadata = event.metadata ?? {};
    return eventDefinitionSchema.parse({
      id: event.id,
      canonicalName: event.name,
      displayName:
        typeof metadata.displayName === "string"
          ? metadata.displayName
          : event.name
              .split(/[._]/)
              .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
              .join(" "),
      domain: typeof metadata.domain === "string" ? metadata.domain : "General",
      description: event.description ?? "No description provided.",
      sourceService:
        typeof metadata.sourceService === "string"
          ? metadata.sourceService
          : undefined,
      suggestedCorrelationKeys: Array.isArray(metadata.suggestedCorrelationKeys)
        ? metadata.suggestedCorrelationKeys
        : [],
      attributes: Array.isArray(metadata.attributes) ? metadata.attributes : [],
      usageCount:
        event.usageCount ??
        (typeof metadata.usageCount === "number" ? metadata.usageCount : 0),
      origin:
        metadata.origin === "discovered" || metadata.origin === "seed"
          ? metadata.origin
          : "user",
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    });
  }

  private mapRule(rule: ApiRule): RuleSummary {
    return {
      id: rule.id,
      name: rule.name,
      description: rule.description,
      operator: rule.operator,
      severity:
        rule.severity === "low"
          ? "info"
          : rule.severity === "medium" || rule.severity === "high"
            ? "warning"
            : "critical",
      status: rule.enabled ? "active" : "paused",
      triggerEvent: rule.triggerEvent ?? "",
      expectedEvents: rule.expectedEvents ?? [],
      window: {
        value: rule.timeoutValue ?? 1,
        unit: rule.timeoutUnit ?? "minutes",
      },
      updatedAt: rule.updatedAt ?? new Date(0).toISOString(),
    };
  }

  private mapRuleDraft(rule: ApiRule): RuleDraft {
    const trigger = rule.triggerEventDefinition;
    const outcomes = rule.expectedEventDefinitions ?? [];
    return ruleDraftSchema.parse({
      id: rule.id,
      name: rule.name,
      description: rule.description ?? "",
      trigger: trigger
        ? {
            eventId: trigger.id,
            canonicalName: trigger.name,
            displayName:
              typeof trigger.metadata?.displayName === "string"
                ? trigger.metadata.displayName
                : trigger.name,
          }
        : null,
      triggerFilters: rule.triggerFilters ?? [],
      operator: rule.operator,
      outcomes: outcomes.map((event) => ({
        eventId: event.id,
        canonicalName: event.name,
        displayName:
          typeof event.metadata?.displayName === "string"
            ? event.metadata.displayName
            : event.name,
      })),
      correlationKey: rule.correlationKey ?? "workflow.id",
      window: {
        value: rule.timeoutValue ?? 1,
        unit: rule.timeoutUnit ?? "minutes",
      },
      severity:
        rule.severity === "low"
          ? "info"
          : rule.severity === "medium" || rule.severity === "high"
            ? "warning"
            : "critical",
      environments: rule.environments ?? ["production"],
      status: rule.enabled ? "active" : "paused",
    });
  }

  private rulePayload(input: RuleDraft) {
    return {
      name: input.name,
      description: input.description,
      triggerEvent: input.trigger?.canonicalName,
      expectedEvents: input.outcomes.map((outcome) => outcome.canonicalName),
      triggerFilters: input.triggerFilters,
      correlationKey: input.correlationKey,
      environments: input.environments,
      operator: input.operator,
      timeoutValue: input.window.value,
      timeoutUnit: input.window.unit,
      severity:
        input.severity === "info"
          ? "low"
          : input.severity === "warning"
            ? "medium"
            : "critical",
      enabled: input.status === "active",
    };
  }

  private mapWorkflow(workflow: ApiWorkflow): WorkflowSummary {
    const environment =
      typeof workflow.metadata?.environment === "string"
        ? workflow.metadata.environment
        : "production";
    return {
      id: workflow.id,
      workflowType: workflow.name ?? workflow.rule?.name ?? "Workflow",
      entityId:
        workflow.externalWorkflow?.externalId ??
        workflow.externalId ??
        workflow.id,
      ruleId: workflow.ruleId,
      ruleName: workflow.rule?.name ?? "Unknown rule",
      state:
        workflow.status === "overdue"
          ? "violated"
          : workflow.status === "cancelled"
            ? "recovered"
            : workflow.status,
      startedAt: workflow.createdAt,
      deadlineAt: workflow.deadline,
      completedAt:
        workflow.status === "completed" ? workflow.updatedAt : undefined,
      environment,
      deploymentVersion:
        typeof workflow.metadata?.deploymentVersion === "string"
          ? workflow.metadata.deploymentVersion
          : undefined,
      serviceName:
        typeof workflow.metadata?.serviceName === "string"
          ? workflow.metadata.serviceName
          : undefined,
    };
  }

  private mapWorkflowDetail(workflow: ApiWorkflow): WorkflowDetail {
    const summary = this.mapWorkflow(workflow);
    const state = workflow.currentState ?? {};
    const received = Array.isArray(state.receivedEvents)
      ? state.receivedEvents.filter(
          (eventName): eventName is string => typeof eventName === "string",
        )
      : [];
    const expected =
      workflow.rule?.expectedEvents ??
      workflow.rule?.expectedEventDefinitions?.map((event) => event.name) ??
      (Array.isArray(state.expectedEvents)
        ? state.expectedEvents.filter(
            (eventName): eventName is string => typeof eventName === "string",
          )
        : []);
    const events = (workflow.externalWorkflow?.eventLogs ?? [])
      .map((log) => ({
        id: log.id,
        canonicalName: log.event.name,
        displayName:
          typeof log.event.metadata?.displayName === "string"
            ? log.event.metadata.displayName
            : log.event.name,
        occurredAt: log.timestamp,
        serviceName:
          typeof log.event.metadata?.sourceService === "string"
            ? log.event.metadata.sourceService
            : undefined,
        traceId: log.traceId ?? undefined,
        spanId: log.spanId ?? undefined,
        attributes: log.payload ?? {},
      }))
      .sort(
        (left, right) =>
          new Date(left.occurredAt).getTime() -
          new Date(right.occurredAt).getTime(),
      );
    return {
      ...summary,
      correlationKey:
        typeof workflow.metadata?.correlationKey === "string"
          ? workflow.metadata.correlationKey
          : "workflow.id",
      correlationValue: summary.entityId,
      operator: workflow.rule?.operator ?? "all",
      events,
      expectedSteps: expected.map((canonicalName) => {
        const observed = events.find(
          (event) => event.canonicalName === canonicalName,
        );
        return {
          canonicalName,
          displayName: canonicalName,
          state: received.includes(canonicalName)
            ? ("completed" as const)
            : summary.state === "violated"
              ? ("missed" as const)
              : ("expected" as const),
          occurredAt: observed?.occurredAt,
        };
      }),
      traceId: events.find((event) => event.traceId)?.traceId,
      attributes: Object.fromEntries(
        Object.entries(workflow.metadata ?? {}).filter(
          (entry): entry is [string, string | number | boolean | null] =>
            entry[1] === null ||
            ["string", "number", "boolean"].includes(typeof entry[1]),
        ),
      ),
    };
  }

  private mapViolation(violation: ApiViolation): ViolationDetail {
    const workflow = violation.workflow
      ? this.mapWorkflowDetail(violation.workflow)
      : undefined;
    const summary: ViolationSummary = {
      id: violation.id,
      workflowId: violation.workflowId,
      ruleId: violation.ruleId,
      ruleName: violation.rule?.name ?? "Unknown rule",
      type: "deadline_exceeded",
      severity:
        violation.severity === "critical" || violation.severity === "high"
          ? "critical"
          : violation.severity === "low"
            ? "info"
            : "warning",
      status: "open",
      explanation: violation.reason,
      triggerEventName:
        violation.rule?.triggerEvent ??
        violation.rule?.triggerEventDefinition?.name ??
        "Unknown trigger",
      affectedEventNames:
        violation.rule?.expectedEvents ??
        violation.rule?.expectedEventDefinitions?.map((event) => event.name) ??
        [],
      occurredAt: violation.occurredAt,
      environment: workflow?.environment ?? "production",
    };
    return {
      ...summary,
      expectedCondition: `Observe ${summary.affectedEventNames.join(", ") || "the expected event"} before the workflow deadline.`,
      observedCondition: violation.reason,
      correlationKey: workflow?.correlationKey ?? "workflow.id",
      correlationValue: workflow?.correlationValue ?? violation.workflowId,
      relatedEvidence: [],
    };
  }
}

export const dataSource: TemporalGuardDataSource =
  new HttpTemporalGuardDataSource();
