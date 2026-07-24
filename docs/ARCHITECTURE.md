# TemporalGuard Architecture and Project Structure

## 1. First Rule: Inspect Before Restructuring

Codex must first map the actual monorepo:

- Package manager and workspace tool.
- Existing frontend application path.
- Existing NestJS backend path.
- Existing TypeORM configuration and migration strategy.
- Existing linting, formatting, testing, Docker, environment, auth, and shared-package conventions.
- Existing UI components, Tailwind version, shadcn configuration, chart libraries, and state libraries.

Do not create a second frontend, duplicate backend, or alternate shared package when an equivalent already exists.

The structure below is the preferred destination when compatible with the repository.

---

## 2. Recommended Monorepo Shape

```text
apps/
  web/
    src/
      app/
      components/
      features/
      lib/
      stores/
      styles/
      test/
  api/
    src/
      modules/
      common/
      config/
      database/
packages/
  contracts/
  config/
  typescript-config/
  eslint-config/
docs/
  design.md
  PRD.md
  ARCHITECTURE.md
  API_AND_DATA_CONTRACTS.md
  ENVIRONMENT_TESTING_AND_DOCKER.md
```

Use the existing names if they differ.

---

## 3. Frontend Route Structure

```text
src/app/
  (auth)/
    layout.tsx
    login/page.tsx
    signup/page.tsx
  (app)/
    layout.tsx
    overview/page.tsx
    live/page.tsx
    workflows/page.tsx
    workflows/[workflowId]/page.tsx
    violations/page.tsx
    violations/[violationId]/page.tsx
    explore/page.tsx
    rules/page.tsx
  loading.tsx
  error.tsx
  not-found.tsx
```

Use route interception or URL-driven drawers only if it matches the repository and does not create brittle complexity. A normal drawer with shareable query parameters is acceptable.

---

## 4. Frontend Feature Modules

```text
src/features/
  auth/
    api/
    components/
    schemas/
    types/
  dashboard/
    api/
    components/
    hooks/
    mappers/
    types/
  events/
    api/
    components/
    schemas/
    storage/
    types/
  query-builder/
    components/
    hooks/
    schemas/
    state/
    types/
    utils/
  workflows/
    api/
    components/
    types/
  violations/
    api/
    components/
    types/
  shared-analytics/
    charts/
    filters/
    tables/
    time-range/
```

A feature owns its business components. Truly generic primitives remain in `components/ui` or `components/shared`.

---

## 5. Shared Component Layers

### `components/ui`

shadcn-based primitives customized to `docs/design.md`:

- Button.
- Input.
- Select.
- Command.
- Popover.
- Dialog.
- Sheet.
- Drawer.
- Tabs.
- Tooltip.
- Dropdown menu.
- Table.
- Badge.
- Skeleton.
- Toast.
- Form primitives.
- Calendar/date range.

### `components/shared`

Product-neutral application components:

- App sidebar.
- Top bar.
- Page header.
- Theme switch.
- Environment selector.
- Time-range selector.
- Compare selector.
- Filter chip bar.
- Data-state boundary.
- Error panel.
- Empty state.
- Metric card.
- Chart panel.
- Search command.

### Feature components

Business-aware components stay within feature folders:

- Event picker.
- Inline event creator.
- Rule operator selector.
- Rule canvas.
- Workflow timeline.
- Violation explanation.

---

## 6. Data Access Boundary

The frontend must not hard-code product data or call HTTP endpoints directly inside pages.

Define a data-source contract:

```ts
interface TemporalGuardDataSource {
  getDashboardOverview(input: DashboardQuery): Promise<DashboardOverview>;
  listEvents(input: EventListQuery): Promise<Paginated<EventDefinition>>;
  createEvent(input: CreateEventInput): Promise<EventDefinition>;
  listWorkflows(input: WorkflowListQuery): Promise<Paginated<WorkflowSummary>>;
  getWorkflow(id: string): Promise<WorkflowDetail>;
  listViolations(
    input: ViolationListQuery,
  ): Promise<Paginated<ViolationSummary>>;
  getViolation(id: string): Promise<ViolationDetail>;
  testRule(input: RuleDraft): Promise<RuleTestResult>;
  listRules(input: RuleListQuery): Promise<Paginated<RuleSummary>>;
}
```

Implement:

```text
HttpTemporalGuardDataSource  — real api calls
```

TanStack Query hooks depend on the contract, not on static arrays.

The application factory selects `HttpTemporalGuardDataSource`. MSW is reserved
for isolated frontend tests and must implement the same contracts as the real
API.

---

## 7. State Ownership

### Server state — TanStack Query

- Dashboard metrics.
- Charts.
- Event catalogue.
- Workflows.
- Violations.
- Rules.
- Rule test results.

### Form state — React Hook Form

- Auth forms.
- New event form.
- Query/rule draft.

For the Query Builder, use one React Hook Form tree or a well-defined reducer integrated with it. Do not create independent uncontrolled state in every node.

### UI state — Zustand

- Sidebar collapsed state.
- Command palette.
- Live stream paused state.
- Builder panel layout.
- Temporary selected node if it is not part of the rule payload.

### Shareable state — URL

- Environment.
- Time range.
- Compare mode.
- Explorer filters.
- View mode.
- Selected record when appropriate.

### Local persistence

Use a versioned storage adapter for:

- Draft rules.
- Optional UI preferences.

Events and saved rules are server state and must be persisted by the API.
Handle migrations and corrupted storage for the remaining local-only values.

---

## 8. Query Builder Architecture

Recommended internal model:

```ts
type RuleOperator = "any" | "all" | "sequence" | "forbid";

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

Keep display/canvas nodes derived from `RuleDraft`. Do not store a second graph representation that can drift from the submitted rule unless a mapper and tests enforce round-trip consistency.

### Event picker

One reusable `EventCombobox` supports:

- Catalogue query.
- Domain grouping.
- Recents.
- Existing selection.
- Details preview.
- Create-new action.

### Inline event creation

Use a controlled nested dialog/sheet carefully to avoid focus conflicts. A right-side event editor panel inside the Query Builder is often more reliable than a dialog over a popover.

On success:

1. Create through the current data source.
2. Update TanStack Query cache.
3. Select the returned event in the correct builder field.
4. Preserve all other rule fields.
5. Announce success accessibly.

---

## 9. Chart Architecture

Provide wrappers rather than configuring Recharts repeatedly:

- `TimeSeriesChart`.
- `StackedAreaChart`.
- `FunnelChart` or custom funnel component.
- `DeadlineHistogram`.
- `ViolationHeatmap`.
- `Sparkline`.

Each wrapper handles:

- Theme tokens.
- Tooltip.
- Legend.
- Axis typography.
- Empty/loading/error state.
- Accessible summary.
- Responsive container.
- Click-through callback.

Do not introduce a second chart library for one widget unless necessary.

---

## 10. Authentication Backend Architecture

Adapt to existing NestJS module patterns.

Recommended modules:

```text
modules/
  auth/
    auth.controller.ts
    auth.service.ts
    auth.module.ts
    dto/
    guards/
    strategies/
    entities/ or session repository
  users/
  workspaces/ or businesses/
  media/
    cloudinary.service.ts
    media.module.ts
```

Recommended entities if absent:

### User

- id.
- firstName.
- lastName.
- email.
- passwordHash.
- status.
- workspaceId.
- createdAt.
- updatedAt.

### Workspace/Business

- id.
- name.
- logoUrl.
- logoPublicId.
- createdAt.
- updatedAt.

### RefreshSession

- id.
- userId.
- tokenHash.
- familyId.
- expiresAt.
- revokedAt.
- userAgent/IP metadata only if existing privacy policy allows.

Use an existing BaseEntity/audit pattern if present.

### Transaction boundary

Registration should:

1. Validate input and file.
2. Upload the logo or use a safe default.
3. Begin DB transaction.
4. Create workspace.
5. Create owner user.
6. Create session if registration logs the user in.
7. Commit.
8. If DB work fails after upload, attempt Cloudinary cleanup and record a safe operational error.

If repository conventions favor creating DB state before external upload, implement a compensating strategy and document it.

---

## 11. Auth Frontend Boundary

Create an `AuthClient` interface:

```ts
interface AuthClient {
  login(input: LoginInput): Promise<AuthSession>;
  signup(input: SignupInput): Promise<AuthSession>;
  logout(): Promise<void>;
  me(): Promise<AuthUser | null>;
}
```

Use `HttpAuthClient` as the application implementation. A test double may be
injected by tests, but runtime components must not select or branch on a mock
mode.

---

## 12. Theme Architecture

- Use CSS variables.
- Use `next-themes` if there is no existing solution.
- Theme values belong in global CSS/tokens.
- Chart wrappers read CSS variables rather than importing hex values.
- Avoid hydration mismatch by following the theme library's recommended mounting pattern.

---

## 13. Animation Architecture

- Framer Motion for route transitions, drawers, list insertion, builder layout, and micro-interactions.
- GSAP only for a dedicated orchestrated timeline or demo sequence.
- No element should be controlled by both libraries.
- Centralize motion tokens and reduced-motion behavior.

---

## 14. Testing Architecture

### Unit

- Zod schemas.
- Duration parsing.
- Rule validation.
- Rule sentence formatter.
- Rule/canvas mapping.
- Event duplicate detection.
- Storage migrations.
- Dashboard mappers.

### Component

- Auth forms.
- Logo uploader.
- Event combobox.
- Inline event creator.
- Operator selector.
- Sequence reordering keyboard support.
- Data-state boundary.

### E2E

- Signup validation and logo flow.
- Login success/failure against the API, with network requests intercepted only in isolated frontend tests.
- Theme persistence.
- Dashboard navigation.
- Create an event inline and use it in a rule.
- Build each operator type.
- Draft survives refresh.
- Open workflow and violation drawers.
- Mobile navigation smoke test.

### Visual review

Use Playwright screenshots for key pages in both themes and common viewport sizes. Do not rely only on screenshots; assert behavior and accessibility.

---

## 15. Error Boundaries and Observability

- Route-level `error.tsx` where appropriate.
- Widget-level error boundaries for dashboards.
- Structured client error reporting adapter with a console implementation allowed locally.
- Do not allow one chart failure to blank the dashboard.
- Future OpenTelemetry browser instrumentation should plug into a central telemetry module.

---

## 16. Docker Architecture

Preserve existing Docker setup. Add or refine only what is necessary:

- Multi-stage frontend Dockerfile.
- Existing backend Dockerfile updates for auth dependencies if needed.
- Compose service for frontend.
- Existing Postgres service.
- Existing OTel Collector.
- Profiles or environment switching for local SigNoz versus SigNoz Cloud.

Recommended modes:

```text
local-observability: frontend + api + postgres + collector + existing local SigNoz
cloud-observability: frontend + api + postgres + collector exporting to SigNoz Cloud
```

Do not embed cloud ingestion keys in frontend build arguments.

---

## 17. Code Quality Rules

- Strict TypeScript.
- No page files containing entire product implementations.
- No hard-coded colors.
- No duplicated data models.
- No excessive index-barrel files that create cycles.
- Prefer named exports for feature components.
- Validate external/API responses at the data boundary when practical.
- Avoid premature generic abstraction; abstract repeated stable patterns.
- Document non-obvious architecture decisions.
