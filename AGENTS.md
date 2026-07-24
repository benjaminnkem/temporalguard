# TemporalGuard Repository Guide

## Repository shape

- Package manager: pnpm 9, pinned by the root `packageManager` field.
- Workspace runner: Turborepo.
- Frontend: `apps/web`, Next.js App Router and TypeScript.
- Backend: `apps/api`, NestJS, TypeORM, PostgreSQL, BullMQ, and Redis.
- Shared packages: `packages/ui`, `packages/eslint-config`, and
  `packages/typescript-config`.
- Local observability: `docker-compose.yml` plus `deploy/signoz`.
- Product and engineering requirements: `docs/PRD.md`,
  `docs/ARCHITECTURE.md`, `docs/API_AND_DATA_CONTRACTS.md`,
  `docs/ENVIRONMENT_TESTING_AND_DOCKER.md`, and `docs/SKILLS_AND_MCP.md`.
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
pnpm --filter api test:e2e -- --runInBand
pnpm --filter api migration:run
pnpm --filter api migration:revert
```

The existing API `lint` script includes `--fix`. When auditing a dirty
worktree, use the following non-mutating equivalent and report failures:

```sh
pnpm --filter api exec eslint "{src,apps,libs,test}/**/*.ts"
```

Local infrastructure:

```sh
cp .env.example .env
docker compose config --quiet
docker compose up -d
docker compose ps
docker compose logs -f api otel-collector
docker compose down
```

Do not run `docker compose down -v` unless the user explicitly requests a full
local data reset.

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

## Verification expectations

After each coherent milestone, run the narrow checks first, then the root
checks. Before handoff, run:

```sh
pnpm format
pnpm lint
pnpm check-types
pnpm --filter api test -- --runInBand
pnpm --filter api test:e2e -- --runInBand
pnpm --filter web test
pnpm --filter web test:e2e
pnpm build
docker compose config --quiet
```

The two web test commands become available when the implementation plan adds
the Vitest and Playwright scripts. Record commands and results in
`docs/IMPLEMENTATION_REPORT.md`. Visual QA must cover 390x844, 768x1024,
1440x900, and 1920x1080 in light and dark themes.
