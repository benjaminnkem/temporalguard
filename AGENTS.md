# TemporalGuard Repository Guide

## Repository shape

- Package manager: pnpm 9, pinned by the root `packageManager` field.
- Workspace runner: Turborepo.
- Frontend: `apps/web`, Next.js App Router and TypeScript.
- Backend: `apps/api`, NestJS, TypeORM, PostgreSQL, BullMQ, and Redis.
- Shared packages: `packages/ui`, `packages/eslint-config`, and
  `packages/typescript-config`.
- Local observability: `docker-compose.yml` plus `deploy/signoz`.
- Durable processing: `apps/api/src/modules/processing` with the separate
  `apps/worker` runtime.
- SigNoz and investigations: API modules under `apps/api/src/modules/signoz`,
  `apps/api/src/modules/investigations`, and `apps/api/src/modules/insights`.
- Observability product UI: `apps/web/features/observability` and the
  `/investigations`, `/comparisons`, `/simulations`, `/deployments`,
  `/explorer`, and `/observability` routes.
- SigNoz dashboards and alert rules: `infra/signoz`; provisioning is wrapped by
  `scripts/signoz-terraform.sh`.
- Product and engineering requirements: `docs/PRD.md`,
  `docs/SYSTEM_ARCHITECTURE.md`, `docs/API_AND_DATA_CONTRACTS.md`,
  `docs/ENVIRONMENT_OPERATIONS_AND_TESTING.md`,
  `docs/LOCAL_DOCKER_AND_RENDER.md`,
  `docs/SIGNOZ_AND_OTEL_INTEGRATION.md`,
  `docs/REALTIME_AND_AGENT_PROCESSING.md`, and
  `docs/SKILLS_AND_TOOLING.md`.
- Design source of truth: `docs/DESIGN.MD` (the tracked filename is uppercase).

## Setup and common commands

Run commands from the repository root unless a command says otherwise.

```sh
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install --frozen-lockfile

pnpm dev
pnpm build
pnpm check-types
pnpm lint
pnpm format
pnpm signoz:fmt
pnpm signoz:validate
```

Targeted commands:

```sh
pnpm --filter web dev
pnpm --filter web build
pnpm --filter web lint
pnpm --filter web check-types

pnpm --filter api start:dev
pnpm --filter api build
pnpm --filter api test -- --runInBand
pnpm --filter api test:e2e --runInBand
pnpm --filter api migration:run
pnpm --filter api migration:revert
pnpm --filter worker dev
pnpm --filter worker build
pnpm --filter worker check-types
```

The current public API prefix is `/api`. The upgrade contract targets
`/api/v1`; introduce that transition with an explicit compatibility period
rather than silently breaking the web HTTP adapters or event producers.

The existing API `lint` script includes `--fix`. When auditing a dirty
worktree, use the following non-mutating equivalent and report failures:

```sh
pnpm --filter api exec eslint "{src,apps,libs,test}/**/*.ts"
```

Local infrastructure:

```sh
cp .env.example .env
pnpm foundry:gauge
pnpm foundry:forge
docker compose -f compose.yaml config --quiet
pnpm local:up
pnpm verify:local
pnpm demo
pnpm local:down
```

`compose.yaml` and `render.yaml` are deterministic generated artifacts. Edit
the sources under `infra/foundry`, `infra/docker`, and `infra/render`, then run
`pnpm foundry:forge`. Validate the final Render Blueprint with
`pnpm render:validate`. Do not deploy Render, apply Terraform, or run
`pnpm local:reset -- --confirm` without explicit approval.

SigNoz Terraform:

```sh
export SIGNOZ_ENDPOINT=https://your-signoz.example
export SIGNOZ_ACCESS_TOKEN=...
pnpm signoz:plan
pnpm signoz:apply
```

Never write SigNoz credentials to Terraform files, variable files, plans,
browser configuration, logs, or version control. `signoz:apply` requires a
reviewed saved plan and an exact interactive confirmation. Do not run it
without explicit user approval.

## Non-negotiable boundaries

- Product pages and product-domain hooks remain behind
  `TemporalGuardDataSource`. Implement the NestJS events, rules, workflows,
  violations, and dashboard APIs against the contracts in
  `docs/API_AND_DATA_CONTRACTS.md`, and select the HTTP data source centrally.
- Backend work includes authentication plus the product APIs required by the
  PRD: registration, login, refresh, logout, current user, workspace/business
  ownership, refresh sessions, server-side logo media handling, events, rules,
  workflows, violations, and dashboard analytics.
- Frontend authentication uses one `AuthClient` boundary with the HTTP adapter
  selected centrally. Components must not contain transport-specific branches.
- Do not implement Monnify, Telegram, billing, notification delivery
- Follow `docs/DESIGN.MD`. Use centralized CSS variables and semantic tokens;
  feature code must not introduce literal colors, arbitrary radii, or a second
  motion/chart system.
- Keep server state in TanStack Query, form state in React Hook Form, UI-only
  cross-component state in Zustand, and shareable analytics state in the URL.
- Prefer server components. Add `"use client"` only at the smallest boundary
  that needs browser state, event handlers, charts, or animation.
- Validate external, API, persisted, and form data with Zod where practical.
  Keep TypeScript strict and do not use `any` without an explicit external
  boundary and narrowing.
- Page files compose feature modules; they do not contain complete features.

## Data and database rules

- TypeORM entities extend the existing `BaseEntity` convention and use the
  current camelCase database column style unless a migration deliberately
  changes it.
- Add explicit migrations. `synchronize` stays disabled in every environment.
- Registration must use a transaction for business and owner creation.
  External media upload requires compensation if the transaction fails.
- Normalize emails and enforce case-insensitive uniqueness at the database
  layer.
- Store password and refresh-token hashes only. Never log credentials or raw
  tokens.
- Product contracts in `docs/API_AND_DATA_CONTRACTS.md` are the target API
  contracts. Adapt or migrate existing backend product entities explicitly;
  do not expose legacy entity shapes directly to the frontend.

## Foundation conventions

- Validate API configuration through
  `apps/api/src/config/environment.ts`. New environment variables must be
  added to the typed schema, the mapped configuration, and the applicable
  `.env.example`; browser-exposed variables must never contain secrets.
- HTTP failures use the stable `{ error: { code, message, details, requestId } }`
  envelope. Add domain-specific codes at the exception boundary instead of
  returning ad hoc controller shapes.
- New collection endpoints use the opaque cursor contract
  `{ data, page: { nextCursor, hasMore } }`. Use deterministic
  `(createdAt, id)` ordering and request one extra row to determine `hasMore`.
  Existing array endpoints require a compatibility migration before changing
  their response shape.
- Upgrade features are opt-in through the typed `FEATURE_*` flags. A disabled
  feature must not register a partially working route, worker, or destructive
  side effect. Do not use flags to fork core product-domain behavior.
- PostgreSQL is authoritative for product and investigation state; Redis is
  for queues, fan-out, locks, and bounded caches; SigNoz is the technical
  telemetry store. The browser never receives SigNoz credentials or submits
  raw telemetry SQL.
- Prefer additive migrations, dual-read compatibility where needed, bounded
  backfills, and delayed removal. Never repurpose or delete legacy columns in
  the same milestone that introduces their replacement.

## Verification expectations

After each coherent milestone, run the narrow checks first, then the root
checks. Before handoff, run:

```sh
pnpm format
pnpm lint
pnpm check-types
pnpm --filter api test -- --runInBand
pnpm --filter api test:e2e --runInBand
pnpm --filter web test
pnpm --filter web test:e2e
pnpm build
docker compose config --quiet
```

The two web test commands become available when the implementation plan adds
the Vitest and Playwright scripts. Record commands and results in
the active implementation report. Visual QA must cover 390x844, 768x1024,
1440x900, and 1920x1080 in light and dark themes.
