# TemporalGuard Phases 1–7 Implementation Report

**Completed:** 2026-07-24  
**Scope:** Product frontend, secure authentication backend, testing, Docker,
and local/cloud SigNoz configuration described by the supplied PRD and phased
implementation brief.

## Outcome

TemporalGuard is now a production-shaped Next.js and NestJS monorepo. The
frontend includes authentication, the authenticated analytics shell, overview,
workflow monitoring, violation analysis, a reusable Event Catalogue, and the
four-mode rule builder. Production runtime data now uses the authenticated HTTP
implementation behind `TemporalGuardDataSource`; the deterministic adapter is
retained only as an explicitly instantiated test fixture.

The backend implements registration, login, refresh rotation, logout, current
session, workspace ownership, server-side Cloudinary logo handling, rate
limiting, secure cookies, and migration-only persistence. Monnify, Telegram,
billing, and notification delivery remain out of scope. Live SigNoz product
queries are implemented server-side with service-account authentication.

## Architecture and decisions

- `apps/web`: Next.js 16 App Router, React 19, Tailwind CSS 4, semantic CSS
  tokens, light/dark/system themes, TanStack Query, React Hook Form, Zod,
  Zustand, Recharts, Framer Motion, Radix primitives, and Lucide icons.
- `apps/api`: NestJS 11, TypeORM, PostgreSQL, Redis/BullMQ, JWT, Argon2id,
  Cloudinary, Sharp validation, cookie parsing, throttling, and OpenTelemetry.
- Product pages never call controllers directly. They use typed query hooks
  over the HTTP `TemporalGuardDataSource` implementation.
- Auth components use a single `AuthClient` interface. The application selects
  HTTP; tests may inject a test client.
- Shareable context and analytics filters live in URL parameters. Server data
  lives in TanStack Query, form state in React Hook Form, and shell-only state
  in Zustand.
- The rule builder stores one validated `RuleDraft`; its graph and human
  sentence are derived views. Custom events move to API persistence; unsaved
  drafts retain versioned local storage.
- The existing `Business` aggregate is the persisted workspace. Registration
  creates the business and owner in one transaction.
- Passwords and refresh tokens are never stored raw. Refresh tokens rotate,
  replacement sessions are linked, and reuse revokes the active family.
- TypeORM `synchronize` is disabled everywhere. Both tenancy and authentication
  have reversible migrations.

## Delivered product surfaces

- `/login` and `/signup`: accessible validation, loading/error feedback, HTTP
  integration, and optional logo drop/select/preview/replace/remove.
- `/overview`: reliability KPIs, state-aware metric cards, reliability chart
  modes, deadline distribution, funnel, heatmap, and recent violations.
- `/live` and `/workflows`: searchable/filterable workflow monitoring,
  configurable columns, polling pause/resume, pagination, and state badges.
- `/workflows/[workflowId]`: summary, event timeline, rule context, evidence,
  and metadata tabs.
- `/violations`: trend, table, group, heatmap, and impact views.
- `/violations/[violationId]`: evidence-oriented detail that explicitly avoids
  presenting correlation as causation.
- `/explore`: query builder for `any`, `all`, `sequence`, and `forbid`;
  validation, warnings, readable sentence, drag-and-drop plus keyboard
  ordering, autosave/restore/reset, and historical evaluation UI.
- `/rules`: saved-rule catalogue.
- `/events`: searchable Event Catalogue with occurrence usage counts, inline
  definition, and selected-event inspection.
- Global shell: responsive sidebar/mobile navigation, environment and time
  context, command palette, theme control, skeleton/loading/error/not-found
  states, and toast feedback.
- Event Catalogue: grouped search, recent items, exact and near-duplicate
  checks, inline creation, cache invalidation, persistence, and selection into
  the initiating field.

## Backend authentication

Endpoints are under `/api/auth`:

| Method | Route       | Behavior                                             |
| ------ | ----------- | ---------------------------------------------------- |
| `POST` | `/register` | Creates workspace and owner; optional validated logo |
| `POST` | `/login`    | Verifies Argon2id password and starts a session      |
| `POST` | `/refresh`  | Rotates the refresh token and links its replacement  |
| `POST` | `/logout`   | Revokes the refresh session and clears cookies       |
| `GET`  | `/me`       | Returns the safe user/workspace session              |

Access and refresh JWTs use separate secrets and TTLs. Both are HTTP-only
cookies. Secure and SameSite behavior is environment-controlled; CORS accepts
only the configured frontend origin with credentials. Stable error codes are
returned for invalid credentials, duplicate email, invalid logo, unavailable
storage, and invalid refresh sessions.

The migration chain now bootstraps cleanly from an empty PostgreSQL database:
`1721700000000-InitialSchema`, the existing event/log decoupling migration,
business tenancy, and `1722000000000-AddAuthentication`. The authentication
migration adds business logo metadata, users, refresh sessions, foreign keys,
lookup indexes, and a database-level case-insensitive unique email index.

## Environment

Frontend (`apps/web/.env.local`):

```env
NEXT_PUBLIC_APP_NAME=TemporalGuard
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
NEXT_PUBLIC_DEFAULT_ENVIRONMENT=production
NEXT_PUBLIC_SIGNOZ_MODE=local
NEXT_PUBLIC_SIGNOZ_UI_URL=http://localhost:3301
```

Backend/Compose secrets and connection values are documented in the root and
API `.env.example` files. Required production secrets are
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CLOUDINARY_CLOUD_NAME`,
`CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET`. SigNoz Cloud additionally
uses `SIGNOZ_CLOUD_OTLP_ENDPOINT` and `SIGNOZ_INGESTION_KEY`. No secret is
prefixed with `NEXT_PUBLIC_`.

## Docker and observability

The web image is a multi-stage, non-root Next.js standalone image. The existing
API image and local SigNoz topology are preserved. Observability is opt-in by
profile:

```sh
# App only; telemetry exporter disabled
docker compose up --build

# App plus self-hosted SigNoz
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
  docker compose --profile observability-local up --build

# App exporting through the cloud collector
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector-cloud:4318 \
SIGNOZ_CLOUD_OTLP_ENDPOINT=https://ingest.<region>.signoz.cloud:443 \
SIGNOZ_INGESTION_KEY=<write-only-key> \
  docker compose --profile observability-cloud up --build
```

Service URLs are web `http://localhost:3000`, API
`http://localhost:4000`, Swagger `http://localhost:4000/docs`, API health
`http://localhost:4000/api/health`, and local SigNoz
`http://localhost:3301`.

Run database migrations explicitly:

```sh
pnpm --filter api migration:run
```

## Dependencies

Frontend additions provide query caching, form/schema validation, scoped state,
charts, motion, accessible primitives, command/search UX, drag-and-drop,
themes, dates, notifications, Tailwind, Vitest/Testing Library, Playwright,
MSW, and axe. Backend additions
provide JWT/session auth, throttling, Argon2id, Cloudinary, cookie parsing,
file inspection, and image metadata validation. No second form, chart, motion,
or auth system was added.

## Editorial purple design-system migration

The updated `docs/DESIGN.MD` defines an editorial, line-led visual direction
with a TemporalGuard-specific purple override:

- True white light-mode and true black dark-mode page canvases.
- Playfair/Georgia display typography, Source Serif/Georgia body typography,
  and a mono stack for technical labels.
- Square corners, flat surfaces, precise border hierarchy, and no drop shadows.
- Violet primary actions, selected states, focus indicators, and chart series,
  with adjacent lavender tones for supporting visualization data.
- Semantic success, warning, and destructive colors reserved for status meaning.
- Restrained 100ms interactions and reduced-motion enforcement.

## Verification record

Completed locally on 2026-07-24:

| Check                              | Result                                |
| ---------------------------------- | ------------------------------------- |
| Web TypeScript                     | Passed                                |
| API TypeScript                     | Passed                                |
| Web ESLint                         | Passed                                |
| API ESLint, non-mutating           | Passed                                |
| Web Vitest                         | 13/13 passed                          |
| API Jest                           | 14/14 passed                          |
| Web Playwright                     | 22/22 passed on Chromium and WebKit   |
| API e2e                            | Blocked: local PostgreSQL unavailable |
| Migration clean up/down/up         | Blocked: Docker daemon not running    |
| Next.js production build           | Passed                                |
| NestJS production build            | Passed                                |
| Web and API Docker image builds    | Passed                                |
| Compose default/local/cloud config | Passed                                |

Playwright currently covers desktop Chromium and mobile WebKit for login
validation with intercepted test responses, analytics navigation and violation
detail, inline event creation
with retained rule state, and the 390×844, 768×1024, 1440×900, and 1920×1080
responsive matrix in both themes. Each viewport also verifies there is no
document-level horizontal overflow.

The design migration was additionally checked in the running application at
390×844, 768×1024, 1440×900, and 1920×1080. Login, overview, and Rule Studio
were inspected in light and dark themes; all four sizes had zero document-level
horizontal overflow, fonts and theme tokens resolved correctly, the mobile
sidebar stayed collapsed, dashboard mode switching worked, and browser logs
contained no warnings or errors.

To repeat API e2e and migration validation, start PostgreSQL and Redis:

```sh
docker compose up -d postgres redis
pnpm --filter api migration:run
pnpm --filter api test:e2e -- --runInBand
pnpm --filter api migration:revert
pnpm --filter api migration:run
```

## Current API implementation boundary

- Product-domain runtime data uses the NestJS API. The deterministic adapter is
  retained only as test-fixture infrastructure.
- Events, rules, workflows, violations, dashboard aggregation, and draft-rule
  historical tests derive workspace scope from the authenticated user.
- Rule persistence supports `any`, `all`, `sequence`, and `forbid` through the
  `1722100000000-ExtendRuleOperators` migration.
- `/api/workflows/stream` provides an authenticated, workspace-filtered SSE
  stream with heartbeats. The frontend deduplicates messages and invalidates
  dashboard, workflow, violation, and event queries while live mode is active.
- Auth uses the NestJS backend through `NEXT_PUBLIC_API_BASE_URL`.
- Logo upload is optional. HTTP signup with a logo requires Cloudinary.
- Monnify, Telegram, notification delivery, and billing remain outside the
  current API implementation scope.

## Rule lifecycle controls

Completed locally on 2026-07-24:

- Rules can be enabled or disabled through
  `PATCH /api/rules/:id/status`, scoped to the authenticated workspace.
- Rule deletion is soft deletion through the
  `1722300000000-AddRuleSoftDelete` migration. Deletion atomically disables
  the rule and records `deletedAt`.
- Normal rule reads and event evaluation exclude soft-deleted rules.
  Historical workflows, violations, and dashboard records can still resolve
  their original rule relation.
- The Rules page exposes enable, disable, and confirmed delete actions with
  query invalidation, pending states, and success/error notifications.
- Rule deletion uses an application modal; browser alert/confirm UI is not
  used.
- Rule Studio recognizes `/explore?rule=:id`, hydrates the persisted rule, and
  saves through `PATCH /api/rules/:id`. Initial creation switches the URL into
  edit mode after the API returns the new ID.
- Trigger filters, correlation key, and environments are persisted through the
  `1722400000000-AddRuleBuilderFields` migration so editing round-trips the
  complete builder state.

| Check                            | Result         |
| -------------------------------- | -------------- |
| Rule soft-delete migration       | Passed/applied |
| Rule lifecycle API e2e           | Passed         |
| Rule lifecycle web unit test     | Passed         |
| Desktop/mobile Playwright action | 2/2 passed     |
| Desktop/mobile Rule Studio edit  | 2/2 passed     |

## Workflow observability correlation

Completed locally on 2026-07-24:

- Event logs now persist the active OpenTelemetry `traceId` and `spanId`
  through the `1722200000000-AddEventLogTraceContext` migration.
- The API exports structured lifecycle logs over OTLP/HTTP alongside traces
  and metrics. Log attributes include workflow, rule, event, violation, and
  event-log identifiers where applicable.
- Workflow detail retains persisted event payloads under Attributes and loads
  trace, log, and metric previews through `TemporalGuardDataSource`.
- Authenticated workflow observability routes query SigNoz
  `/api/v5/query_range` server-side for correlated traces, structured logs,
  and custom workflow metrics.
- The SigNoz service-account key remains server-only. Missing query
  configuration produces an explicit non-error UI state, and upstream query
  failures produce a retryable panel error.
- The configured Cloud key must belong to a service account with the
  `signoz-viewer` (or an equivalent read-capable) role.
- SigNoz actions use backend-generated correlated trace/explorer links when
  available. Newly emitted workflow metrics include `workflow.id` and
  `rule.id`; telemetry emitted before this change is not retroactively
  correlated.

| Check                                | Result         |
| ------------------------------------ | -------------- |
| Trace-context migration              | Passed/applied |
| API Jest                             | 16/16 passed   |
| API e2e                              | 3/3 passed     |
| Web Vitest                           | 13/13 passed   |
| Web TypeScript                       | Passed         |
| Next.js production build             | Passed         |
| NestJS production build              | Passed         |
| `pnpm dev` startup and `/api/health` | Passed         |
| SigNoz query service unit tests      | 2/2 passed     |
