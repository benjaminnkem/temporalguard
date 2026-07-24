# TemporalGuard Phases 1–7 Implementation Report

**Completed:** 2026-07-24  
**Scope:** Product frontend, secure authentication backend, testing, Docker,
and local/cloud SigNoz configuration described by the supplied PRD and phased
implementation brief.

## Outcome

TemporalGuard is now a production-shaped Next.js and NestJS monorepo. The
frontend includes authentication, the authenticated analytics shell, overview,
workflow monitoring, violation analysis, a reusable Event Catalogue, and the
four-mode rule builder. The current frontend baseline contains a deterministic
test adapter behind `TemporalGuardDataSource`; the next implementation phase
replaces the runtime selection with the real HTTP adapter without component
changes.

The backend implements registration, login, refresh rotation, logout, current
session, workspace ownership, server-side Cloudinary logo handling, rate
limiting, secure cookies, and migration-only persistence. Monnify, Telegram,
billing, notifications, and live SigNoz product queries remain out of scope.

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
themes, dates, notifications, Tailwind, locally bundled Kalam and Patrick Hand
font files, Vitest/Testing Library, Playwright, MSW, and axe. Backend additions
provide JWT/session auth, throttling, Argon2id, Cloudinary, cookie parsing,
file inspection, and image metadata validation. No second form, chart, motion,
or auth system was added.

## Hand-drawn design-system migration

The updated `docs/DESIGN.MD` replaces the earlier precision-analytics visual
direction. The web application now consumes a centralized hand-drawn token
layer:

- Warm dotted paper and dark charcoal-paper canvases.
- Kalam headings and Patrick Hand body typography bundled into the application
  so production builds do not depend on a font CDN.
- Wobbly reusable radii, pencil borders, correction-red primary actions,
  ballpoint-blue secondary interactions, post-it highlights, and semantic
  success/warning/error colors in both themes.
- Shared hard offset shadows and tactile press/hover states on buttons, cards,
  inputs, dialogs, navigation, and authentication surfaces.
- Tape and tack card treatments, dashed separators, sketch labels, and
  irregular active navigation without scattering literal feature colors.
- Animated theme icons, live-state pulse, dashboard mode selection, chart
  transitions, loading-to-content entry, and responsive dialogs. Reduced-motion
  behavior remains enforced globally.

## Verification record

Completed locally on 2026-07-24:

| Check                              | Result                               |
| ---------------------------------- | ------------------------------------ |
| Web TypeScript                     | Passed                               |
| API TypeScript                     | Passed                               |
| Web ESLint                         | Passed                               |
| API ESLint, non-mutating           | Passed                               |
| Web Vitest                         | 13/13 passed                         |
| API Jest                           | 14/14 passed                         |
| Web Playwright                     | 22/22 passed on Chromium and WebKit  |
| API e2e                            | 3/3 passed, including auth lifecycle |
| Migration clean up/down/up         | Passed on disposable PostgreSQL 16   |
| Next.js production build           | Passed; 12 routes generated          |
| NestJS production build            | Passed                               |
| Web and API Docker image builds    | Passed                               |
| Compose default/local/cloud config | Passed                               |

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

- Product-domain runtime data must move to the NestJS API; the existing
  deterministic adapter is retained only as test-fixture infrastructure during
  the migration.
- Auth uses the NestJS backend through `NEXT_PUBLIC_API_BASE_URL`.
- Logo upload is optional. HTTP signup with a logo requires Cloudinary.
- Monnify, Telegram, notification delivery, billing, and live SigNoz queries
  remain outside the current API implementation scope.
