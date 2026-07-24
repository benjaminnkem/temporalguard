# TemporalGuard SigNoz Upgrade Implementation Plan

Status: active  
Audit date: July 24, 2026  
Scope: additive upgrade of the existing monorepo; no destructive rewrite

## 1. Audit summary

TemporalGuard is a pnpm/Turborepo monorepo with a Next.js 16 App Router web
application, a NestJS 11 API, PostgreSQL through TypeORM, Redis/BullMQ, and an
OTel-to-SigNoz local stack. The repository is not an empty scaffold: it already
implements the product core that the upgrade must preserve.

The upgrade documents describe a larger target with a separate worker, durable
investigations, safe SigNoz query APIs, comparisons, simulations, deployment
analysis, telemetry-quality scoring, a gateway, Foundry-generated deployment
assets, and Render infrastructure. Those services and domains do not exist yet.
They must be added around the current product rather than replacing it.

## 2. Architecture as implemented

### Frontend

- `apps/web`: Next.js 16, React 19, App Router, TypeScript, Tailwind 4.
- Product routes: overview, live, events, rules, workflows, violations,
  explore, settings, login, and signup.
- `TemporalGuardDataSource` is the product transport boundary.
  `HttpTemporalGuardDataSource` is selected centrally and maps legacy API
  entities into frontend view contracts.
- `AuthClient` provides the equivalent authentication boundary.
- TanStack Query owns server state; React Hook Form and Zod own forms; Zustand
  is limited to UI state.
- Vitest and Playwright are configured. The shared UI package remains small;
  most product primitives currently live under `apps/web/components`.

### Backend

- `apps/api`: NestJS modules for auth, businesses, users, media, events, rules,
  workflows, violations, dashboard, health, and telemetry.
- Authentication uses access JWTs plus hashed, rotating refresh sessions.
- Workspace access supports user sessions and hashed business API keys.
- Registration creates business ownership transactionally and compensates a
  failed external logo upload.
- The event workflow engine evaluates `any`, `all`, `sequence`, and `forbid`;
  BullMQ schedules deadline processing.
- Workflow observability exposes bounded trace/log/metric previews through a
  server-side SigNoz service.
- The current public prefix is `/api`; the target contract is `/api/v1`.

### Database

- PostgreSQL is the product source of truth; TypeORM `synchronize` is disabled.
- Nine explicit migrations build business tenancy, auth, refresh sessions,
  API keys, event definitions/logs, external workflows, rule-event joins,
  trace context, soft-deleted rules, and rule-builder fields.
- Core tables are company-scoped using the existing `businessId` name.
- Event occurrences are decoupled from event definitions and may correlate to
  external workflows; workflows evaluate one rule.
- Email uniqueness is enforced with a database `LOWER(email)` index.
- Missing upgrade tables include SigNoz connections, investigations, steps,
  evidence, agent runs/tool calls, comparisons, simulations, deployments,
  telemetry-quality snapshots, audit, and durable stream events.

### Docker and runtime

- Root Compose starts web, API, PostgreSQL, and Redis.
- `observability-local` adds ZooKeeper, ClickHouse, SigNoz, migrations, and the
  SigNoz collector.
- `observability-cloud` adds a cloud-exporting collector.
- The API and web have multi-stage Dockerfiles and health checks.
- There is no gateway, standalone worker, demo system, Foundry casting/output,
  Render Blueprint, or Terraform observability pack yet.

### OpenTelemetry and SigNoz

- API instrumentation is loaded before Nest and exports traces, metrics, and
  logs over OTLP/HTTP.
- The local collector receives OTLP, enriches resources, batches, and exports
  to ClickHouse; a separate config exports to SigNoz Cloud.
- Business spans and metrics are emitted by the telemetry module.
- The current workflow query adapter calls SigNoz from the backend. It is an
  early preview adapter, not yet the typed, audited, company-filter-enforcing
  Query Range client required by the target design.

## 3. Working behavior to preserve

- Registration, login, refresh, logout, current-user lookup, workspace
  ownership, profile/logo updates, and API-key ingestion authentication.
- Events Catalogue, inline event creation, usage counts, and trace/span context.
- Rule CRUD, draft testing, enable/disable, soft delete, and all four operators.
- Event ingestion, external correlation, workflow transition/deadline
  processing, violation creation, and workspace isolation.
- Overview analytics, live workflow updates, workflow/violation detail, theme,
  responsive shell, and the current design token system.
- HTTP data-source and auth-client boundaries, existing migrations and records,
  local SigNoz ingestion, and current workflow observability previews.

## 4. Contract and implementation mismatches

| Area                  | Repository reality                            | Upgrade target / action                                                                               |
| --------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| API prefix            | `/api`                                        | Introduce `/api/v1` with a compatibility window.                                                      |
| Collections           | Unbounded arrays; frontend wraps them locally | Add opaque `(createdAt,id)` cursor pages, then migrate adapters endpoint by endpoint.                 |
| Errors                | Default Nest and service-specific shapes      | Use the stable error envelope and domain codes.                                                       |
| Company name          | `businessId`                                  | Keep storage naming; expose company semantics through contracts without a destructive rename.         |
| Workflow state        | `waiting/completed/overdue/cancelled`         | Add explicit near-deadline, violated, and recovered-late semantics compatibly.                        |
| Violation state       | Severity/reason only                          | Add type, lifecycle status, recovery, explanation, and evidence links.                                |
| Events                | `timestamp` plus `createdAt`                  | Standardize contract names `occurredAt` and `receivedAt` while preserving columns until migrated.     |
| Frontend event schema | Rich catalogue metadata                       | Backend stores flexible JSON metadata; add shared validation and explicit DTO fields.                 |
| Dashboard lists       | Frontend consumes mapped dashboard responses  | Move to domain list endpoints with filters and pagination without breaking current pages.             |
| SSE                   | In-process EventEmitter, no resume            | Add durable sequence storage, Redis fan-out, `Last-Event-ID`, and reconciliation.                     |
| SigNoz queries        | Workflow preview endpoints                    | Add a typed v5 Query Range adapter with enforced scope, limits, audit, redaction, retry, and breaker. |
| Local topology        | No gateway/worker/demo                        | Add services incrementally; do not split deadline processing until recovery semantics are tested.     |
| SigNoz deployment     | Hand-maintained Compose assets                | Adopt Foundry-generated output with a reviewed compatibility migration.                               |
| Frontend route        | `/explore`                                    | Target names `/explorer`; retain redirect/alias during transition.                                    |

## 5. Baseline verification before foundation changes

Commands were run against the pre-existing dirty worktree using non-mutating
API lint:

| Command                                                        | Result                                                                                                                                                     |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm --filter api exec eslint "{src,apps,libs,test}/**/*.ts"` | Failed: six Prettier-only errors in pre-existing business settings/API-key files.                                                                          |
| `pnpm check-types`                                             | Passed.                                                                                                                                                    |
| `pnpm --filter web lint`                                       | Failed: 13 pre-existing warnings are fatal under `--max-warnings 0` (prop validation, unused symbols, unstable hook dependencies, and one empty block).    |
| `pnpm --filter api test -- --runInBand`                        | Passed: 4 suites, 16 tests.                                                                                                                                |
| `pnpm --filter api test:e2e -- --runInBand`                    | Command-shape failure: pnpm forwarded a literal `--`, so Jest treated `--runInBand` as a pattern and found no tests.                                       |
| `pnpm --filter api test:e2e --runInBand`                       | Corrected invocation ran 4 tests: 2 passed and 2 failed because the local database has not run migration `1722500000000`; `businesses.website` is missing. |
| `pnpm --filter web test`                                       | Passed: 3 files, 14 tests.                                                                                                                                 |
| `pnpm --filter web test:e2e`                                   | Failed: 19 passed, 7 failed. Rule-builder controls were not found in desktop/mobile cases; one mobile violation navigation also failed.                    |
| `pnpm build`                                                   | Passed for API and web.                                                                                                                                    |
| `docker compose config --quiet`                                | Passed.                                                                                                                                                    |

These failures pre-date the foundation changes and are not evidence that the
new upgrade features work. Full infrastructure startup, empty-database
migration, collector export, SigNoz query, Foundry, Terraform, and Render
validation remain unverified.

## 6. Target repository structure

Adopt the documented structure in additive milestones:

```text
apps/
  web/                  existing product UI
  api/                  existing HTTP/SSE API
  worker/               investigation/simulation/comparison jobs
  demo-system/          opt-in deterministic telemetry generator
packages/
  contracts/            shared Zod schemas and API types
  config/               reusable typed environment schemas
  observability/        OTel bootstrap and semantic conventions
  signoz-client/        safe Query Range adapter
  investigation-engine/
  test-utils/
infra/
  gateway/
  otel/
  signoz/{casting,generated,terraform}/
  render/
scripts/
```

Do not extract code merely to match the diagram. Create a package only when at
least two runtimes consume it or when its security boundary benefits from
independent tests.

## 7. Delivery milestones

### M0 — Audit and foundation (completed)

- Typed API environment validation with production safety checks.
- Stable HTTP error envelope and request IDs.
- Reusable opaque cursor primitives without breaking existing array routes.
- Typed, opt-in feature flags for incomplete upgrade domains.
- Updated repository guidance and this reality-based plan.
- Targeted tests for configuration, errors, pagination, and flags.

Exit: current product builds; existing response success shapes are unchanged.

### M1 — Contracts and compatibility

- Add `packages/contracts` with Zod request/response schemas.
- Version API as `/api/v1` while retaining a documented `/api` compatibility
  route for the current web and ingestion clients.
- Add cursor DTOs and company-scoped indexes, then migrate one collection at a
  time.
- Normalize frontend API error handling and cursor pages at the data-source
  boundary.
- Add `occurredAt`/`receivedAt` compatibility fields and idempotency keys.

Exit: web uses v1 contracts; old producers have a tested migration path.

### M2 — SigNoz query foundation

- Implement the typed Query Range client, safe templates, company filters,
  redaction, audit records, timeouts, retries, cancellation, and breaker.
- Add encrypted SigNoz connection storage and validation.
- Move workflow observability previews onto the shared adapter.
- Centralize semantic attributes and collector redaction/health.

Exit: trace/log/metric queries are server-owned, bounded, tested, and auditable.

### M3 — Durable processing and realtime

- Add additive investigation/evidence/step/agent/audit/stream migrations.
- Add `apps/worker`, BullMQ job contracts, leases, idempotency, cancellation,
  retries, dead-letter state, and graceful shutdown.
- Replace in-process-only upgrade streams with Redis fan-out plus durable replay.
- Keep workflow deadlines independent from investigation availability.

Exit: a worker crash or reconnect does not lose investigation state/progress.

### M4 — Investigation vertical slice

- Build deterministic context, evidence collection, completeness scoring,
  ranking, and evidence-cited report generation.
- Add optional bounded AI synthesis behind a feature flag.
- Add investigation list/detail, live timeline, evidence table/graph, export,
  and exact SigNoz links.

Exit: the controlled failed workflow yields an auditable evidence-only report
when AI is disabled.

### M5 — Comparisons, simulations, deployments, and quality

- Implement cohort comparison and historical rule simulation as immutable jobs.
- Observe deployment versions and calculate before/after impact.
- Add telemetry-quality snapshots and recommendations.
- Add the frontend workspaces and URL-owned analytical filters.

Exit: all results disclose samples, gaps, partial data, and correlation limits.

### M6 — Infrastructure and observability pack

- Add gateway routes and redirect-first `/signoz`.
- Adopt Foundry castings and generated local/Render assets without hand-editing
  generated files.
- Add deterministic Blueprint merge validation.
- Add versioned SigNoz Terraform dashboards/alerts with plan-before-apply.
- Add verification scripts and runbooks.

Exit: local and Render plans validate; no deployment or Terraform apply occurs
without explicit approval.

### M7 — Hardening and rollout

- Cross-company isolation, outage, cancellation, recovery, rate-limit, and
  prompt-injection tests.
- Empty-database and upgrade migration rehearsals with rollback notes.
- Responsive/light/dark/accessibility QA at all required viewports.
- Enable features progressively only after their milestone gates pass.

## 8. Foundation decisions

- Existing product endpoints keep their successful response shape in M0.
- New collection endpoints use `{ data, page }`; legacy endpoints migrate
  explicitly in M1.
- `businessId` remains the database tenancy key for now.
- All upgrade feature flags default off.
- SigNoz/AI/Redis failure must not block business event persistence or deadline
  violation creation.
- No raw SigNoz SQL, query credentials, or unrestricted filters reach the
  browser.
- No existing table, column, volume, or working route is deleted in this plan.

## 9. Immediate follow-up

1. Add unit tests for the new foundation primitives.
2. Correct the API e2e command convention and establish a database-backed e2e
   fixture.
3. Diagnose the seven Playwright failures without weakening assertions.
4. Add shared contracts and the `/api/v1` compatibility strategy.
5. Implement cursor pagination for events first, then rules, workflows, and
   violations, with frontend adapter support.
