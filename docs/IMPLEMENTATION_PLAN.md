# TemporalGuard Implementation Plan

**Status:** Phases 0–7 implemented; verification results are recorded in
`docs/IMPLEMENTATION_REPORT.md`  
**Audit date:** 2026-07-24  
**Scope authority:** `docs/PRD.md` and the phased prompt supplied with the task

## 1. Discovered architecture

### Workspace and tooling

- The repository is a pnpm 9 workspace (`pnpm-workspace.yaml`) orchestrated by
  Turborepo 2.10.
- Root tasks are `dev`, `build`, `lint`, `check-types`, and `format`.
- Node is declared as 18 or newer. Docker images currently use Node 20 Alpine.
- TypeScript is strict through `packages/typescript-config`; the shared base
  also enables `noUncheckedIndexedAccess`.
- Prettier exists at the root and in the API. There is no root format-check
  task, only a write task.

### Frontend

- `apps/web` is the only frontend. It uses Next.js 16.2, React 19.2, the App
  Router, local Geist fonts, and a root-level `app` directory.
- It remains the stock Turborepo starter with one static `/` route and CSS
  Modules. It has no Tailwind, shadcn configuration, theme provider, chart
  library, form library, query client, Zustand store, API data-source layer,
  frontend test runner, or Playwright setup.
- `packages/ui` contains only three starter components. Its button contains a
  demo alert and is not a production design system.
- There is no `apps/web/Dockerfile`, web Compose service, middleware, or auth
  code.

### Backend

- `apps/api` is NestJS 11 with TypeORM, PostgreSQL, BullMQ/Redis, Swagger,
  validation pipes, health checks, event emission, and OpenTelemetry.
- Modules are organized by domain with controllers, DTOs, entities, services,
  interfaces, and barrel exports.
- Current modules are businesses, dashboard, events, health, rules, telemetry,
  violations, and workflows. There is no auth, user, refresh-session, media,
  Cloudinary, cookie, JWT, password hashing, or rate-limiting implementation.
- `BaseEntity` supplies UUID `id`, `createdAt`, and `updatedAt`.
- The working tree includes an uncommitted business-tenancy migration and
  associated entity/controller/service changes. These are treated as existing
  user work and must be preserved.
- Both the standalone TypeORM data source and the Nest database module now
  use `synchronize: false`; schema changes are migration-only.
- Current migrations are
  `1721811600000-DecoupleEventsAndLogs.ts` and the uncommitted
  `1721900000000-AddBusinessTenancy.ts`.
- Existing API product contracts differ from the target frontend contracts:
  backend rules currently expose only `any` and `all`, for example. The API
  implementation must close these gaps explicitly before each frontend surface
  switches to it.

### Tests and quality

- API unit tests use Jest/ts-jest. The only current unit suite covers four
  workflow-engine cases.
- The API e2e suite boots the complete `AppModule`, so it requires reachable
  PostgreSQL and Redis even for the health test.
- There are no frontend unit, component, accessibility, or e2e tests.
- Web and shared UI lint use non-mutating ESLint commands. The API lint script
  runs ESLint with `--fix`, which is unsafe for a baseline audit on a dirty
  worktree.

### Docker, environment, and observability

- `docker-compose.yml` contains PostgreSQL 16, Redis 7, the API, ClickHouse,
  ZooKeeper, SigNoz, the SigNoz telemetry-store migrator, and the SigNoz OTel
  Collector.
- The API has a multi-stage, non-root Dockerfile. Compose validates. No web
  image/service exists.
- The API initializes OpenTelemetry before Nest and exports traces/metrics over
  OTLP/HTTP. Collector configuration exports to the local ClickHouse-backed
  SigNoz installation.
- Current configuration supports local SigNoz only. A cloud-mode collector
  path is not yet implemented.
- Root and API `.env.example` files contain local database, Redis, telemetry,
  and SigNoz values. Auth, Cloudinary, frontend, cookie, CORS, and cloud
  observability variables are absent.

## 2. Requirements gap summary

| Area          | Current repository                 | Required destination                            |
| ------------- | ---------------------------------- | ----------------------------------------------- |
| Web product   | Starter page                       | Auth, app shell, analytics routes, builder      |
| Design system | Starter CSS                        | Central purple light/dark tokens and primitives |
| Product data  | No frontend boundary               | Typed HTTP data source backed by NestJS APIs    |
| Forms/state   | None                               | RHF/Zod, TanStack Query, scoped Zustand         |
| Charts        | None                               | Reusable accessible Recharts wrappers           |
| Auth backend  | None                               | Secure cookie sessions, rotation, Cloudinary    |
| Tests         | API-only minimal                   | Schema/component/backend/Playwright coverage    |
| Docker        | API + local SigNoz                 | Web image and local/cloud collector modes       |
| Documentation | Product bundle plus current README | Exact runnable report and env guidance          |

## 3. Decisions and assumptions

1. Keep the existing `apps/web/app` root rather than moving it under `src`;
   create `components`, `features`, `lib`, `stores`, and `test` beside it.
2. Keep `apps/web` as the only frontend and `apps/api` as the only backend.
3. Convert `packages/ui` from starter examples into the shared primitive layer
   instead of creating a duplicate UI package. Product-aware components stay
   in `apps/web`.
4. Add `packages/contracts` for Zod-validated frontend/product contracts shared
   by the NestJS API, HTTP adapter, and test fixtures. Update the existing
   product API to implement these contracts without leaking entity shapes.
5. Use Tailwind CSS with shadcn conventions, `next-themes`, Recharts,
   TanStack Query, React Hook Form, Zod, Zustand, Framer Motion, Lucide, and MSW
   because no accepted equivalents exist.
6. Use URL search parameters for environment, time range, compare mode, views,
   filters, and selected workflow/violation. Zustand owns only ephemeral shell
   and builder presentation state.
7. Use one `RuleDraft` form model. Canvas nodes and readable sentences are
   derived views, never independently persisted graph state.
8. Persist custom events and saved rules through the API. Use versioned
   local-storage adapters only for unsaved rule drafts and preferences; all
   reads occur in client-safe boundaries and parse with Zod.
9. Frontend auth uses the HTTP adapter selected through a central factory.
   Tests inject a test double or intercept HTTP without component branches.
10. Extend the existing `Business` entity rather than creating a competing
    workspace entity. The UI may say “workspace”; storage remains `businesses`.
11. Use Argon2id, hashed rotating refresh sessions, and HTTP-only same-site
    cookies. Access cookies are short-lived; refresh reuse revokes the token
    family.
12. Upload and validate the optional logo server-side, store Cloudinary
    `secure_url` and `public_id`, and compensate by deleting an uploaded asset
    if the database transaction fails.
13. Preserve local SigNoz exactly. Add a separate cloud collector configuration
    or Compose override/profile rather than making local exporters depend on
    empty cloud credentials.
14. Monnify and Telegram remain unimplemented. No current source reference
    requires compatibility work.

## 4. Planned dependency changes

Versions will be resolved by pnpm and committed in `pnpm-lock.yaml`.

### Frontend/runtime

- `tailwindcss`, `@tailwindcss/postcss`, `postcss`
- `next-themes`
- `@tanstack/react-query` and query devtools in development only
- `react-hook-form`, `@hookform/resolvers`, `zod`
- `zustand`
- `framer-motion`
- `lucide-react`
- `recharts`
- `class-variance-authority`, `clsx`, `tailwind-merge`
- Required Radix primitives only: slot, dialog, dropdown-menu, popover, select,
  tabs, tooltip, label, checkbox, switch, separator, scroll-area, and toast or
  `sonner`
- `cmdk` for the command palette/Event Catalogue
- `@dnd-kit/core`, `@dnd-kit/sortable`, and utilities for sequence reordering
- `date-fns` in the web package if date helpers are needed there

### Frontend/test

- `msw`
- `vitest`, `jsdom`
- `@testing-library/react`, `@testing-library/user-event`,
  `@testing-library/jest-dom`
- `@playwright/test`
- `axe-core` or `@axe-core/playwright`

### Backend/runtime

- `@nestjs/jwt`, `@nestjs/throttler`
- `argon2`
- `cloudinary`
- `cookie-parser` and its types
- `file-type` and an image metadata library such as `sharp` if validation
  cannot be implemented reliably with existing upload metadata

No GSAP, second chart library, second form library, or client auth SDK is
planned.

## 5. Milestone implementation map

### Milestone 1 — frontend foundation

Modify:

- `apps/web/package.json`
- `apps/web/next.config.js`
- `apps/web/app/layout.tsx`
- `apps/web/app/globals.css`
- `apps/web/app/page.tsx`
- `packages/ui/package.json`
- `packages/ui/src/*`
- `pnpm-lock.yaml`

Add:

- `apps/web/postcss.config.mjs`
- `apps/web/components.json`
- `apps/web/app/providers.tsx`
- `apps/web/components/shared/*`
- `apps/web/features/shared-analytics/{charts,filters,tables,time-range}/*`
- `apps/web/lib/{cn,env,query-client,query-keys,data-source}/*`
- `apps/web/stores/ui-store.ts`
- `apps/web/test/{setup,server,handlers}/*`
- `packages/contracts/package.json`
- `packages/contracts/src/{common,analytics,dashboard,events,rules,workflows,violations,auth}.ts`

Deliver central tokens, light/dark/system theme, query provider, HTTP data
boundary, shell primitives, data-state boundary, chart wrappers, motion
tokens, skeletons, and a validation route only.

### Milestone 2 — backend authentication

Modify:

- `apps/api/package.json`
- `apps/api/src/app.module.ts`
- `apps/api/src/config/configuration.ts`
- `apps/api/src/main.ts`
- `apps/api/src/modules/businesses/entities/business.entity.ts`
- `apps/api/src/modules/index.ts`
- `apps/api/.env.example`
- `.env.example`
- `pnpm-lock.yaml`

Add:

- `apps/api/src/modules/users/{users.module.ts,entities/user.entity.ts}`
- `apps/api/src/modules/auth/{auth.module.ts,controllers,services,dto,guards,decorators,entities,interfaces}/*`
- `apps/api/src/modules/media/{media.module.ts,services/cloudinary.service.ts,validators}/*`
- `apps/api/src/database/migrations/1722000000000-AddAuthentication.ts`
- Auth unit/integration fixtures and specs under the owning modules and
  `apps/api/test/auth.e2e-spec.ts`

Migration strategy:

- Add nullable logo URL/public ID columns to `businesses`.
- Add `users` with normalized/case-insensitive unique email, password hash,
  status, and business foreign key.
- Add `refresh_sessions` with token hash, family ID, expiry, revocation,
  replacement linkage, and user foreign key.
- Add indexes for business ownership, active session lookup, expiry cleanup,
  and normalized email uniqueness.
- Provide a reversible `down` migration and validate up/down against a
  disposable database.

### Milestone 3 — login and signup

Add:

- `apps/web/app/(auth)/layout.tsx`
- `apps/web/app/(auth)/login/page.tsx`
- `apps/web/app/(auth)/signup/page.tsx`
- `apps/web/features/auth/{api,components,schemas,types}/*`
- `apps/web/features/auth/api/{auth-client,http-auth-client,factory}.ts`
- Auth component tests and Playwright flows

The logo field supports accessible selection/drop, preview, replace, remove,
validation, simulated progress, and error recovery. Pages never call `fetch`
directly.

### Milestone 4 — authenticated shell and overview

Add:

- `apps/web/app/(app)/layout.tsx`
- `apps/web/app/(app)/overview/page.tsx`
- `apps/web/features/shell/*`
- `apps/web/features/dashboard/{api,components,hooks,mappers,types}/*`
- dashboard API implementation, deterministic fixtures, and tests

Implement URL-backed global context, navigation, metric cards, reliability
chart modes, funnel, deadline pressure, heatmap, recent violations, widget
partial failures, and accessible summaries.

### Milestone 5 — Event Catalogue and Query Builder

Add:

- `apps/web/app/(app)/explore/page.tsx`
- `apps/web/app/(app)/rules/page.tsx`
- `apps/web/features/events/{api,components,schemas,storage,types}/*`
- `apps/web/features/query-builder/{components,hooks,schemas,state,types,utils}/*`
- comprehensive schema, operator, persistence, cache, keyboard, component, and
  Playwright tests

The creation mutation writes through the active data source, updates all
matching catalogue query caches, closes the editor, restores focus, and
selects the returned event in the initiating field without resetting the RHF
draft. Operator changes preserve compatible outcomes and request confirmation
only for destructive transformations.

### Milestone 6 — live workflows and violations

Add:

- `apps/web/app/(app)/live/page.tsx`
- `apps/web/app/(app)/workflows/page.tsx`
- `apps/web/app/(app)/workflows/[workflowId]/page.tsx`
- `apps/web/app/(app)/violations/page.tsx`
- `apps/web/app/(app)/violations/[violationId]/page.tsx`
- `apps/web/features/workflows/{api,components,types}/*`
- `apps/web/features/violations/{api,components,types}/*`
- route loading/error files and E2E coverage

Cross-links carry current analytical search parameters. API polling is
pausable and cache-aware; evidence is explicitly labeled correlated, not
causal.

### Milestone 7 — Docker, QA, and handoff

Modify:

- `apps/web/next.config.js` for standalone output
- `apps/api/Dockerfile` only where auth runtime dependencies require it
- `docker-compose.yml`
- `deploy/signoz/README.md`
- `.env.example`
- `apps/api/.env.example`
- root `README.md`
- `AGENTS.md`

Add:

- `apps/web/Dockerfile`
- `apps/web/.env.example`
- cloud collector override/config under `deploy/signoz`
- `playwright.config.ts`
- frontend Vitest configuration
- `docs/IMPLEMENTATION_REPORT.md`

Local observability remains the default. Cloud mode exports through the
collector with a server-side ingestion header and does not start the local
SigNoz data plane unless explicitly requested.

## 6. Data-source and API strategy

- `TemporalGuardDataSource` exposes dashboard, event, workflow, violation,
  rule, and rule-test operations described in `docs/ARCHITECTURE.md`.
- `HttpTemporalGuardDataSource` is the active implementation and validates API
  responses against `packages/contracts`.
- The NestJS controllers and services implement the same contracts with
  authentication, workspace isolation, validation, pagination, and explicit
  migrations.
- TanStack Query hooks depend on the interface/factory, not endpoint calls or
  MSW handlers.
- MSW models HTTP latency and errors only in isolated frontend tests; API
  integration and E2E tests run against the NestJS application.
- Test seed time is fixed and advanced by a deterministic clock. Fixture IDs
  are stable.
- Test scenarios cover healthy, partial, forbidden, out-of-order, waiting,
  near-deadline, overdue, recovered, deployment-adjacent, empty, filtered
  empty, slow, partial failure, and total failure states.

## 7. Test plan

### Static and build

- Root format, lint, typecheck, and build.
- Package-targeted checks during each milestone.
- Validate Compose configuration and build both application images.
- Validate TypeORM migration up/down on a disposable PostgreSQL database.

### Unit

- All Zod schemas and boundary parsing.
- Auth/password/file validation.
- Rule operator semantics and activation validation.
- Sentence/canvas derivation.
- Event exact/near duplicate detection.
- Storage versioning, migration, corruption, and reset.
- Query keys and dashboard mappers.
- Backend auth rotation, reuse, logout, transaction, and media compensation.

### Component/accessibility

- Login, signup, logo upload, and error summary.
- Theme switch and hydration-safe mounting.
- Data-state boundary and background refresh.
- Event selector search/grouping/keyboard behavior.
- Inline creation, cache update, focus restoration, and draft preservation.
- Operator switching and sequence keyboard reordering.
- Charts with accessible summaries.
- Workflow/violation detail surfaces.

### E2E and visual review

- All flows listed in `docs/ENVIRONMENT_TESTING_AND_DOCKER.md`.
- Light and dark screenshots at 390x844, 768x1024, 1440x900, and 1920x1080.
- Console/hydration checks and axe scans on critical routes.

## 8. Baseline checks

Checks were run against the unmodified product code and current dirty working
tree. The API lint script's `--fix` was intentionally bypassed.

| Check                               | Result                                                                                                                       |
| ----------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `pnpm check-types`                  | Blocked before execution: local pnpm launcher could not verify/fetch pinned pnpm 9.0.0                                       |
| Web `next typegen` + `tsc --noEmit` | Pass                                                                                                                         |
| Shared UI `tsc --noEmit`            | Pass                                                                                                                         |
| API `tsc --noEmit`                  | Fail: workflow-engine test fixture is missing new business/entity fields                                                     |
| Web ESLint                          | Pass                                                                                                                         |
| Shared UI ESLint                    | Pass                                                                                                                         |
| API ESLint without `--fix`          | Fail: 19 errors and 2 warnings, primarily existing Prettier and unsafe-value issues                                          |
| API Jest unit suite                 | Pass: 1 suite, 4 tests                                                                                                       |
| API Jest e2e suite                  | Fail during AppModule boot: PostgreSQL/Redis are inaccessible in the sandbox; cleanup also dereferences an uninitialized app |
| API production build                | Pass                                                                                                                         |
| Web production build                | Pass; `/` and `/_not-found` generated                                                                                        |
| `docker compose config --quiet`     | Pass                                                                                                                         |

The pnpm launcher issue is local tooling state, not a repository source
failure. Subsequent phases should restore a trusted pnpm 9 installation before
changing the lockfile. The API type/lint failures should be fixed in a
dedicated baseline cleanup that preserves the user's uncommitted tenancy work.

## 9. Risks and mitigations

- **Dirty backend worktree:** keep changes narrow, inspect diffs before every
  backend edit, and never bulk-format unrelated files.
- **Migration drift:** test the existing two migrations plus auth migration
  from an empty database and from the legacy state.
- **Development synchronization:** disable or explicitly gate synchronization
  once auth migrations land so local success cannot hide missing migrations.
- **Cookie topology:** document localhost and production origin assumptions;
  configure CORS credentials and CSRF protection consistently.
- **Cloudinary/database atomicity:** external upload cannot join a DB
  transaction, so use explicit compensation and test cleanup failure safely.
- **Builder state loss:** one RHF source of truth, versioned autosave, and
  creation callbacks keyed to the initiating field.
- **Large client bundles:** preserve server components, lazy-load charts and
  builder panels, and inspect production bundle output.
- **SigNoz regression:** do not rewrite the known-good local collector; isolate
  cloud routing in a separate explicit mode and validate both Compose graphs.
- **Accessibility regression in dense UI:** build keyboard behavior and text
  summaries into shared foundations before feature pages.

## 10. Phase 0 exit

Phase 0 changes only documentation:

- Expanded the tracked design source with a concrete token contract,
  analytics-density rules, and analytical interpretation rules.
- Added repository-specific `AGENTS.md`.
- Added this implementation plan and recorded baseline results.

No page, dependency, backend feature, migration, environment file, or Docker
runtime behavior was changed in this phase.
