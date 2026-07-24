# TemporalGuard API and Data Contracts

These contracts define the shape the frontend should target. Existing backend conventions take precedence for envelope naming and IDs, but the semantic fields should remain stable.

## 1. Authentication Endpoints

### `POST /auth/register`

Content type: `multipart/form-data`

Fields:

```text
firstName: string
lastName: string
email: string
password: string
businessName: string
logo: image file, optional if product allows a generated default
```

Success response:

```json
{
  "user": {
    "id": "usr_...",
    "firstName": "Ada",
    "lastName": "Okafor",
    "email": "ada@example.com"
  },
  "workspace": {
    "id": "wsp_...",
    "name": "Northstar Labs",
    "logoUrl": "https://res.cloudinary.com/..."
  }
}
```

If auth uses cookies, tokens must not be returned unnecessarily in the body.

Stable error codes:

```text
AUTH_EMAIL_ALREADY_EXISTS
AUTH_WEAK_PASSWORD
AUTH_INVALID_LOGO
AUTH_LOGO_UPLOAD_FAILED
AUTH_REGISTRATION_FAILED
VALIDATION_ERROR
RATE_LIMITED
```

### `POST /auth/login`

```json
{
  "email": "ada@example.com",
  "password": "..."
}
```

Stable errors:

```text
AUTH_INVALID_CREDENTIALS
AUTH_ACCOUNT_DISABLED
RATE_LIMITED
```

### `POST /auth/refresh`

Rotates refresh session and returns/sets a new access session.

### `POST /auth/logout`

Revokes the current refresh session and clears cookies.

### `GET /auth/me`

Returns safe user and workspace information.

---

## 2. Core Frontend Types

### Event definition

```ts
type EventAttributeType =
  | "string"
  | "number"
  | "boolean"
  | "timestamp"
  | "enum"
  | "identifier";

type EventAttributeDefinition = {
  key: string;
  label: string;
  type: EventAttributeType;
  description?: string;
  required: boolean;
  sensitive: boolean;
  enumValues?: string[];
};

type EventDefinition = {
  id: string;
  canonicalName: string;
  displayName: string;
  domain: string;
  description: string;
  sourceService?: string;
  suggestedCorrelationKeys: string[];
  attributes: EventAttributeDefinition[];
  firstSeenAt?: string;
  lastSeenAt?: string;
  usageCount: number;
  origin: "seed" | "user" | "discovered";
  createdAt: string;
  updatedAt: string;
};
```

### Create event input

```ts
type CreateEventInput = {
  canonicalName: string;
  displayName: string;
  domain: string;
  description: string;
  sourceService?: string;
  suggestedCorrelationKeys: string[];
  attributes: EventAttributeDefinition[];
};
```

### Rule

```ts
type RuleOperator = "any" | "all" | "sequence" | "forbid";
type RuleSeverity = "info" | "warning" | "critical";

type DurationUnit = "seconds" | "minutes" | "hours" | "days";

type DurationValue = {
  value: number;
  unit: DurationUnit;
};

type EventReference = {
  eventId: string;
  canonicalName: string;
  displayName: string;
};

type EventFilter = {
  attribute: string;
  operator:
    | "equals"
    | "not_equals"
    | "contains"
    | "exists"
    | "greater_than"
    | "less_than";
  value?: string | number | boolean;
};

type RuleDraft = {
  id?: string;
  name: string;
  description?: string;
  trigger: EventReference | null;
  triggerFilters: EventFilter[];
  operator: RuleOperator;
  outcomes: EventReference[];
  correlationKey: string;
  window: DurationValue;
  severity: RuleSeverity;
  environments: string[];
  status: "draft" | "active" | "paused";
};
```

### Historical test result

```ts
type RuleTestResult = {
  evaluatedCount: number;
  completedCount: number;
  violatedCount: number;
  openCount: number;
  completionRate: number;
  medianCompletionMs: number | null;
  p95CompletionMs: number | null;
  samples: Array<{
    workflowId: string;
    state: "completed" | "violated" | "open";
    startedAt: string;
    completedAt?: string;
    violatedAt?: string;
  }>;
  dataMode: "mock" | "live";
};
```

---

## 3. Workflow Contracts

```ts
type WorkflowState =
  | "waiting"
  | "near_deadline"
  | "completed"
  | "violated"
  | "recovered";

type WorkflowEventInstance = {
  id: string;
  eventId: string;
  canonicalName: string;
  displayName: string;
  occurredAt: string;
  serviceName?: string;
  traceId?: string;
  spanId?: string;
  attributes: Record<string, string | number | boolean | null>;
};

type ExpectedWorkflowStep = {
  eventId: string;
  canonicalName: string;
  displayName: string;
  state: "completed" | "current" | "expected" | "missed" | "forbidden_seen";
  occurredAt?: string;
  deadlineAt?: string;
};

type WorkflowSummary = {
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

type WorkflowDetail = WorkflowSummary & {
  correlationKey: string;
  correlationValue: string;
  operator: RuleOperator;
  events: WorkflowEventInstance[];
  expectedSteps: ExpectedWorkflowStep[];
  traceId?: string;
  attributes: Record<string, string | number | boolean | null>;
};
```

---

## 4. Violation Contracts

```ts
type ViolationType =
  | "missing_expected_event"
  | "missing_required_events"
  | "out_of_order_event"
  | "forbidden_event_observed"
  | "deadline_exceeded";

type ViolationSummary = {
  id: string;
  workflowId: string;
  ruleId: string;
  ruleName: string;
  type: ViolationType;
  severity: RuleSeverity;
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

type ViolationDetail = ViolationSummary & {
  expectedCondition: string;
  observedCondition: string;
  correlationKey: string;
  correlationValue: string;
  workflow: WorkflowDetail;
  relatedEvidence: Array<{
    kind: "trace" | "log" | "metric" | "deployment";
    title: string;
    description: string;
    reference?: string;
    confidence?: "low" | "medium" | "high";
  }>;
};
```

---

## 5. Dashboard Contracts

```ts
type MetricSummary = {
  value: number;
  formattedValue: string;
  deltaPercent?: number;
  direction?: "up" | "down" | "flat";
  trend: Array<{ timestamp: string; value: number }>;
};

type DashboardOverview = {
  health: "healthy" | "degraded" | "critical";
  completionRate: MetricSummary;
  activeWorkflows: MetricSummary;
  nearDeadline: MetricSummary;
  violations: MetricSummary;
  medianCompletionMs: MetricSummary;
  p95CompletionMs: MetricSummary;
  reliabilitySeries: Array<{
    timestamp: string;
    started: number;
    completed: number;
    violated: number;
    waiting: number;
    completionRate: number;
    p95DurationMs: number;
  }>;
  deadlineBuckets: Array<{
    bucket: "lt_5m" | "lt_15m" | "lt_1h" | "overdue";
    count: number;
  }>;
  recentViolations: ViolationSummary[];
};
```

---

## 6. Pagination and Query Contracts

Use cursor-ready results even in mock mode:

```ts
type Paginated<T> = {
  items: T[];
  nextCursor: string | null;
  total?: number;
};
```

Common analytical query:

```ts
type AnalyticsContext = {
  environment: string;
  from: string;
  to: string;
  compareFrom?: string;
  compareTo?: string;
  filters: Array<{
    field: string;
    operator: string;
    value: unknown;
  }>;
};
```

---

## 7. Mock Persistence

Use browser storage only through a typed adapter:

```text
temporalguard.mock.events.v1
temporalguard.mock.ruleDrafts.v1
temporalguard.preferences.v1
```

Requirements:

- Parse with Zod.
- Migrate or discard invalid versions safely.
- Never read local storage during server rendering.
- Seed deterministic events.
- Custom events must survive refresh.
- A reset action must restore seed state.
