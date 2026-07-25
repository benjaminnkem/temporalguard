# TemporalGuard

Business process observability engine for monitoring **business invariants**.

Unlike traditional observability tools that monitor infrastructure (CPU, memory, latency, errors), TemporalGuard watches business events and detects workflows that never reach a valid ending.

**Example invariant**

> When a payment is authorized, it must either be captured or reversed within 15 minutes.

TemporalGuard does **not** replace SigNoz. SigNoz is the observability platform; TemporalGuard is a rule engine that sits on top of OpenTelemetry and self-hosted SigNoz.

```
Application
    ↓
Business Events
    ↓
TemporalGuard API
    ↓
OpenTelemetry SDK
    ↓
OpenTelemetry Collector
    ↓
SigNoz
    ↓
ClickHouse
```

## Architecture

Monorepo powered by [Turborepo](https://turborepo.dev/) + [pnpm](https://pnpm.io/).

```
temporalguard/
├── apps/
│   ├── api/                 # NestJS REST API and authentication
│   └── web/                 # Next.js product application
├── packages/
│   ├── eslint-config/
│   ├── typescript-config/
│   └── node/                # temporalguard-node SDK (npm)
├── .github/workflows/       # CI + npm publish
├── deploy/
│   └── signoz/              # Self-hosted SigNoz configs (official Docker layout)
├── docker-compose.yml       # Full local stack
└── turbo.json
```

## CI/CD

GitHub Actions run on every PR and push to `main` (typecheck, lint, unit tests, build).

Publishing the Node SDK:

```bash
# after bumping packages/node/package.json version and merging to main
git tag temporalguard-node-v0.1.1
git push origin temporalguard-node-v0.1.1
```

Requires repo secret `NPM_TOKEN`. Full guide: [`docs/CI_CD.md`](./docs/CI_CD.md).

## Tech Stack

| Layer         | Technology                           |
| ------------- | ------------------------------------ |
| Runtime       | Node.js ≥ 20                         |
| Web           | Next.js 16, React 19, Tailwind CSS 4 |
| API           | NestJS                               |
| Database      | PostgreSQL 16 (TypeORM)              |
| Queue / cache | Redis 7 (BullMQ)                     |
| Telemetry     | OpenTelemetry SDK → OTLP/HTTP        |
| Observability | Self-hosted SigNoz + ClickHouse      |
| Language      | TypeScript 5.9                       |

## Prerequisites

- **Docker** Engine 20.10+ and **Docker Compose** v2
- At least **4 GB** RAM allocated to Docker (SigNoz + ClickHouse)
- **Node.js ≥ 20** and **pnpm 9** (for host development)

No SigNoz credentials are required for the default app-only mode. Cloudinary
is required only when real HTTP signup uploads a logo.

## Quick start (full stack)

Start the web, API, PostgreSQL, and Redis:

```sh
docker compose up -d --build
```

This starts:

| Service    | Role                              |
| ---------- | --------------------------------- |
| `web`      | TemporalGuard Next.js application |
| `api`      | TemporalGuard NestJS API          |
| `postgres` | Application database              |
| `redis`    | Cache / BullMQ                    |

Add `--profile observability-local` for the bundled SigNoz stack, or
`--profile observability-cloud` for the cloud collector. Exact commands are in
[`docs/IMPLEMENTATION_REPORT.md`](docs/IMPLEMENTATION_REPORT.md).

### Service URLs

| Service         | URL                              |
| --------------- | -------------------------------- |
| **Web**         | http://localhost:3000            |
| **API**         | http://localhost:4000            |
| **API Swagger** | http://localhost:4000/docs       |
| **API health**  | http://localhost:4000/api/health |
| **SigNoz**      | http://localhost:3301            |
| **PostgreSQL**  | localhost:5432                   |
| **Redis**       | localhost:6379                   |
| **OTLP gRPC**   | localhost:4317                   |
| **OTLP HTTP**   | localhost:4318                   |

When running the local profile, complete the local admin signup on the first
visit to SigNoz. Cloud mode uses the configured SigNoz Cloud workspace.

Once the API receives traffic, the **temporalguard-api** service appears under Services / Traces in the SigNoz UI.

## Docker commands

```sh
# Start app services (detached)
docker compose up -d --build

# Start app plus local SigNoz
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318 \
  docker compose --profile observability-local up -d --build

# Follow logs
docker compose logs -f

# Follow web + API
docker compose logs -f web api

# Status / health
docker compose ps

# Rebuild API image after code changes
docker compose up -d --build api

# Stop containers (keep volumes)
docker compose down

# Stop and remove named volumes (full reset)
docker compose down -v
```

## Environment

Copy the root example for Compose variables:

```sh
cp .env.example .env
```

Key variables (self-hosted only — **no** SigNoz Cloud keys):

```env
NODE_ENV=development

OTEL_SERVICE_NAME=temporalguard-api
OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4318
OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# SigNoz images (pinned)
SIGNOZ_VERSION=v0.128.0
OTELCOL_TAG=v0.144.5
SIGNOZ_UI_PORT=3301
```

Inside Docker, the API talks to other services by **service name**:

| Variable                      | Docker value                 | Host-local value        |
| ----------------------------- | ---------------------------- | ----------------------- |
| `DB_HOST`                     | `postgres`                   | `localhost`             |
| `REDIS_HOST`                  | `redis`                      | `localhost`             |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://otel-collector:4318` | `http://localhost:4318` |

## Hybrid mode (API on host)

If you prefer hot-reload on the host while infrastructure runs in Docker:

```sh
# Infrastructure only (exclude the API container)
docker compose up -d postgres redis clickhouse zookeeper-1 init-clickhouse \
  signoz-telemetrystore-migrator signoz otel-collector

cp apps/api/.env.example apps/api/.env
pnpm install
pnpm --filter api start:dev
```

`apps/api/.env` should point at published ports (`localhost:5432`, `localhost:6379`, `http://localhost:4318`).

## OpenTelemetry

The NestJS process loads `instrumentation.ts` **before** the application boots (`import './instrumentation'` in `main.ts`).

- **Traces** → `POST {OTEL_EXPORTER_OTLP_ENDPOINT}/v1/traces`
- **Metrics** → `POST {OTEL_EXPORTER_OTLP_ENDPOINT}/v1/metrics`
- Protocol: **OTLP/HTTP protobuf** (`http/protobuf`)
- Collector service name: `otel-collector` (Docker network)

Business-level spans and metrics (workflows, violations, rules) are emitted by the in-app `TelemetryService` on top of auto-instrumentation.

## Data model

### Entities

```
BusinessEvent ──< EventLog >── ExternalWorkflow ──< Workflow >── Rule
      │                                                   │         │
      └──────── trigger / expected event definitions ─────┘         │
                                                                  Violation
```

| Entity               | Table                | Description                                                         |
| -------------------- | -------------------- | ------------------------------------------------------------------- |
| **BusinessEvent**    | `business_events`    | Reusable event definition identified by a unique name               |
| **EventLog**         | `event_logs`         | Independent record that a business event occurred                   |
| **ExternalWorkflow** | `external_workflows` | External business-process identity used to correlate logs           |
| **Rule**             | `rules`              | Temporal invariant linked to trigger and expected event definitions |
| **Workflow**         | `workflows`          | Evaluation of one rule for an external business process             |
| **Violation**        | `violations`         | Recorded breach when a workflow fails its rule                      |

### Enums

| Enum                | Values                                         |
| ------------------- | ---------------------------------------------- |
| `RuleSeverity`      | `low`, `medium`, `high`, `critical`            |
| `RuleOperator`      | `any`, `all`                                   |
| `TimeoutUnit`       | `seconds`, `minutes`, `hours`, `days`          |
| `WorkflowStatus`    | `waiting`, `completed`, `overdue`, `cancelled` |
| `EventType`         | `business`, `system`                           |
| `ViolationSeverity` | `low`, `medium`, `high`, `critical`            |

## API reference

Base path: `/api`

### Rules

| Method   | Endpoint         | Description      |
| -------- | ---------------- | ---------------- |
| `POST`   | `/api/rules`     | Create a rule    |
| `GET`    | `/api/rules`     | List all rules   |
| `GET`    | `/api/rules/:id` | Get a rule by ID |
| `PATCH`  | `/api/rules/:id` | Update a rule    |
| `DELETE` | `/api/rules/:id` | Delete a rule    |

#### Create rule — example payload

```json
{
  "name": "payment-must-resolve-within-15m",
  "description": "Payment must be captured or reversed within 15 minutes",
  "triggerEvent": "payment.authorized",
  "expectedEvents": ["payment.captured", "payment.reversed"],
  "operator": "any",
  "timeoutValue": 15,
  "timeoutUnit": "minutes",
  "severity": "high",
  "enabled": true
}
```

**Required fields**: `name`, `triggerEvent`, `expectedEvents`, `timeoutValue`

**Optional fields** (with defaults): `description`, `operator` (`all`), `timeoutUnit` (`minutes`), `severity` (`medium`), `enabled` (`true`)

### Workflows

| Method   | Endpoint             | Description          |
| -------- | -------------------- | -------------------- |
| `POST`   | `/api/workflows`     | Create a workflow    |
| `GET`    | `/api/workflows`     | List all workflows   |
| `GET`    | `/api/workflows/:id` | Get a workflow by ID |
| `PATCH`  | `/api/workflows/:id` | Update a workflow    |
| `DELETE` | `/api/workflows/:id` | Delete a workflow    |

### Events

| Method   | Endpoint          | Description                         |
| -------- | ----------------- | ----------------------------------- |
| `POST`   | `/api/events`     | Create or reuse an event definition |
| `GET`    | `/api/events`     | List event definitions              |
| `GET`    | `/api/events/:id` | Get an event definition             |
| `PATCH`  | `/api/events/:id` | Update an event definition          |
| `DELETE` | `/api/events/:id` | Delete an event definition          |

#### Create event definition

```json
{
  "name": "payment.authorized",
  "type": "business",
  "description": "A payment authorization was approved"
}
```

Rules continue to accept `triggerEvent` and `expectedEvents` as names. The API
resolves those names to event-definition UUIDs and creates missing definitions
automatically.

### Event logs

| Method | Endpoint          | Description                            |
| ------ | ----------------- | -------------------------------------- |
| `POST` | `/api/event-logs` | Record and process an event occurrence |

```json
{
  "eventName": "payment.authorized",
  "externalWorkflowId": "payment_123",
  "timestamp": "2026-07-24T10:00:00.000Z",
  "payload": {
    "amount": 1000,
    "currency": "USD"
  }
}
```

`externalWorkflowId` is optional. Without it, the occurrence is stored as a
standalone log. With it, TemporalGuard finds or creates the external process,
then matches or creates rule workflows and applies expected events to active
workflows. Event logs are never owned by an individual TemporalGuard workflow.

### Violations

| Method   | Endpoint              | Description           |
| -------- | --------------------- | --------------------- |
| `POST`   | `/api/violations`     | Create a violation    |
| `GET`    | `/api/violations`     | List all violations   |
| `GET`    | `/api/violations/:id` | Get a violation by ID |
| `PATCH`  | `/api/violations/:id` | Update a violation    |
| `DELETE` | `/api/violations/:id` | Delete a violation    |

## Development scripts

```sh
# API watch mode (host)
pnpm --filter api start:dev

# Type check
pnpm check-types

# Lint
pnpm lint

# Format
pnpm format
```

## Troubleshooting

| Symptom                          | What to check                                                                                              |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| SigNoz UI not loading            | `docker compose ps` — wait until `signoz` is healthy; allow ~1–2 minutes on first start                    |
| No `temporalguard-api` in SigNoz | Hit any API endpoint, then refresh Services; confirm collector is up: `docker compose logs otel-collector` |
| API unhealthy                    | `docker compose logs api` — usually waiting on Postgres/Redis                                              |
| Out of memory / restarts         | Give Docker ≥ 4 GB RAM                                                                                     |
| Port already in use              | Change `API_HOST_PORT`, `POSTGRES_PORT`, `SIGNOZ_UI_PORT`, etc. in `.env`                                  |

## License

Private
