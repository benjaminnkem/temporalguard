# TemporalGuard

Business-process observability for promises that must become true on time.

[![Agents of SigNoz Hackathon](https://img.shields.io/badge/Agents%20of%20SigNoz-Track%203%3A%20Build%20Your%20Own-111111?style=for-the-badge)](https://www.wemakedevs.org/hackathons/signoz/)
[![Open the live site](https://img.shields.io/badge/Live%20site-Open%20TemporalGuard-6d28d9?style=for-the-badge)](https://temporalguard.oluwadunsin.dev)
[![Watch the demo](https://img.shields.io/badge/Demo%20video-Watch%20now-4c1d95?style=for-the-badge)](https://temporalguard.oluwadunsin.dev/video)

TemporalGuard is an entry for the **Agents of SigNoz Hackathon, Track 3:
Build Your Own**. It detects broken business workflows from OpenTelemetry
signals, starts durable investigations, and presents the evidence needed to
understand what happened.

Traditional observability tells you that a request failed or a service became
slow. TemporalGuard answers a business question:

> When a payment is authorized, was it captured or reversed within 15 minutes?

TemporalGuard does not replace SigNoz. It adds a business-invariant and
investigation layer on top of OpenTelemetry and a **self-hosted SigNoz
deployment**.

## What it does

- Defines time-bound business rules and their expected outcomes.
- Correlates events into workflows.
- Detects overdue workflows and records violations.
- Runs durable, queue-backed investigations.
- Compares periods, explores evidence, and analyzes deployments.
- Sends application traces, metrics, and logs through OpenTelemetry.
- Uses self-hosted SigNoz and ClickHouse as the technical telemetry platform.

## Demo

- [Open the live TemporalGuard application](https://temporalguard.oluwadunsin.dev)
- [Watch the full product demo](https://temporalguard.oluwadunsin.dev/video)

## How it works

```text
Instrumented application
        │
        ▼
TemporalGuard API ──► PostgreSQL (product and investigation state)
        │
        ├────────────► Redis / BullMQ ──► TemporalGuard worker
        │
        ▼
OpenTelemetry Collector
        │
        ▼
Self-hosted SigNoz ──► ClickHouse
```

PostgreSQL is authoritative for product state. Redis supports queues, fan-out,
locks, and bounded caches. SigNoz stores and queries technical telemetry;
credentials never reach the browser.

## Repository

```text
temporalguard/
├── apps/
│   ├── api/                 # NestJS API, auth, product APIs, investigations
│   ├── gateway/             # Public reverse proxy and route boundary
│   ├── web/                 # Next.js product application
│   └── worker/              # BullMQ durable-processing runtime
├── packages/
│   ├── node/                # TemporalGuard Node.js SDK
│   ├── ui/
│   ├── eslint-config/
│   └── typescript-config/
├── infra/
│   ├── foundry/             # SigNoz Foundry inputs and generated artifacts
│   ├── docker/              # Application Compose source
│   ├── render/              # Render Blueprint source
│   └── signoz/              # SigNoz dashboards and alert rules
├── docs/                    # Product, architecture, contracts, and runbooks
├── compose.yaml             # Generated local-stack artifact
└── render.yaml              # Generated Render Blueprint
```

The self-hosted SigNoz deployment is generated from
[`infra/foundry`](infra/foundry). The exact resolved installation is captured
in [`infra/foundry/casting.yaml.lock`](infra/foundry/casting.yaml.lock), making
the telemetry stack reviewable and reproducible.

## Technology

| Layer              | Technology                                     |
| ------------------ | ---------------------------------------------- |
| Web                | Next.js 16, React 19, TypeScript, Tailwind CSS |
| API                | NestJS, TypeORM                                |
| Durable processing | BullMQ worker                                  |
| Product data       | PostgreSQL 16                                  |
| Queue and cache    | Redis 7                                        |
| Telemetry          | OpenTelemetry over OTLP/HTTP                   |
| Observability      | Self-hosted SigNoz and ClickHouse              |
| Workspace          | pnpm 9 and Turborepo                           |

## Reproduce the project locally

### Requirements

- Git
- Node.js 20 or newer
- Corepack
- Docker Engine with Docker Compose v2
- At least 6 GB of memory available to Docker
- Ports `8088`, `3301`, `4317`, `4318`, `5432`, and `6379` available, or
  corresponding overrides in `.env`

### 1. Clone and install

```sh
git clone <your-fork-or-repository-url>
cd temporalguard
corepack enable
corepack prepare pnpm@9.0.0 --activate
pnpm install --frozen-lockfile
```

### 2. Configure the environment

```sh
cp .env.example .env
```

The checked-in defaults target the local, self-hosted stack. Before using the
project outside local development, replace the sample database, encryption,
JWT, and cookie values. Cloudinary variables are needed only for real logo
uploads during signup.

### 3. Generate and start the complete stack

```sh
pnpm foundry:gauge
pnpm foundry:forge
pnpm local:up
```

`pnpm local:up` validates the Foundry inputs, regenerates the deterministic
Compose artifacts, builds the applications, runs migrations, starts all
services, and waits for health checks. The first run downloads images and can
take several minutes.

### 4. Initialize SigNoz

Open [http://localhost:3301](http://localhost:3301) and complete the initial
local admin setup. This account belongs to your self-hosted instance.

If the investigation and explorer views need server-side query access, create
a least-privilege SigNoz service-account API key, set `SIGNOZ_API_KEY` in
`.env`, and restart the API and worker:

```sh
docker compose -f compose.yaml up -d --force-recreate api worker
```

Never expose the key through a `NEXT_PUBLIC_*` variable or commit it.

### 5. Verify and load demo scenarios

```sh
pnpm verify:local
pnpm demo
```

The demo command creates successful, failed, investigation, and isolation
scenarios. Once traffic is ingested, `temporalguard-api` appears in the SigNoz
Services and Traces views.

### Local URLs

| Service                | URL                                                                              |
| ---------------------- | -------------------------------------------------------------------------------- |
| TemporalGuard          | [http://localhost:8088](http://localhost:8088)                                   |
| API readiness          | [http://localhost:8088/api/health/ready](http://localhost:8088/api/health/ready) |
| Explorer               | [http://localhost:8088/explorer](http://localhost:8088/explorer)                 |
| SigNoz through gateway | [http://localhost:8088/signoz](http://localhost:8088/signoz)                     |
| Self-hosted SigNoz UI  | [http://localhost:3301](http://localhost:3301)                                   |
| OTLP gRPC              | `localhost:4317`                                                                 |
| OTLP HTTP              | `localhost:4318`                                                                 |

### Stop or reset

```sh
# Stop services but retain volumes
pnpm local:down

# Remove local data only when you intentionally want a clean environment
pnpm local:reset -- --confirm
```

## Application development

For host-side hot reload, install dependencies and run the whole workspace:

```sh
pnpm dev
```

Or run one application:

```sh
pnpm --filter web dev
pnpm --filter api start:dev
pnpm --filter worker dev
```

When running an application on the host, point its database, Redis, and OTLP
settings to the published localhost ports. See
[`docs/ENVIRONMENT_OPERATIONS_AND_TESTING.md`](docs/ENVIRONMENT_OPERATIONS_AND_TESTING.md)
and [`docs/OPERATIONS_RUNBOOK.md`](docs/OPERATIONS_RUNBOOK.md) for environment,
backup, sizing, and lifecycle details.

## Useful commands

| Command                | Purpose                                                 |
| ---------------------- | ------------------------------------------------------- |
| `pnpm foundry:gauge`   | Validate local and production Foundry inputs            |
| `pnpm foundry:forge`   | Regenerate self-hosted SigNoz deployment artifacts      |
| `pnpm local:up`        | Build, migrate, start, and health-check the local stack |
| `pnpm verify:local`    | Verify application and infrastructure readiness         |
| `pnpm demo`            | Generate representative business-workflow scenarios     |
| `pnpm format`          | Format TypeScript, TSX, and Markdown                    |
| `pnpm lint`            | Run workspace lint checks                               |
| `pnpm check-types`     | Run workspace type checks                               |
| `pnpm test`            | Run workspace test tasks                                |
| `pnpm build`           | Build every application and package                     |
| `pnpm signoz:validate` | Validate SigNoz Terraform assets                        |
| `pnpm render:validate` | Validate the generated Render Blueprint                 |

## Verification before contributing

Run the narrow check for the application you changed, followed by the
repository checks:

```sh
pnpm format
pnpm lint
pnpm check-types
pnpm --filter api test -- --runInBand
pnpm --filter api test:e2e --runInBand
pnpm --filter web test
pnpm --filter web test:e2e
pnpm build
docker compose -f compose.yaml config --quiet
```

## API and SDK

The current public API prefix is `/api`. Rules describe a trigger event,
expected outcomes, an operator, a time limit, and severity. Applications can
submit occurrences to `POST /api/event-logs`; TemporalGuard correlates them
with external workflows and evaluates matching rules.

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

See [`docs/API_AND_DATA_CONTRACTS.md`](docs/API_AND_DATA_CONTRACTS.md) for the
product API and data contracts, and
[`docs/PUBLIC_API_AND_SDK.md`](docs/PUBLIC_API_AND_SDK.md) for SDK integration.

## Further documentation

- [Product requirements](docs/PRD.md)
- [System architecture](docs/SYSTEM_ARCHITECTURE.md)
- [SigNoz and OpenTelemetry integration](docs/SIGNOZ_AND_OTEL_INTEGRATION.md)
- [Realtime and agent processing](docs/REALTIME_AND_AGENT_PROCESSING.md)
- [Local Docker and Render architecture](docs/LOCAL_DOCKER_AND_RENDER.md)
- [Operations runbook](docs/OPERATIONS_RUNBOOK.md)
- [Design system](docs/DESIGN.MD)

## Troubleshooting

| Problem                        | Check                                                                                                                 |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------- |
| SigNoz is not ready            | Allow several minutes on first boot, then inspect `docker compose -f compose.yaml logs temporalguard-signoz-signoz-0` |
| No `temporalguard-api` service | Call an API endpoint and inspect `docker compose -f compose.yaml logs ingester`                                       |
| API is unhealthy               | Inspect `docker compose -f compose.yaml logs api`; PostgreSQL or Redis may still be starting                          |
| Containers restart             | Increase Docker memory to at least 6 GB                                                                               |
| A port is occupied             | Override the corresponding port in `.env`, then regenerate and restart                                                |
| Generated files drift          | Run `pnpm foundry:gauge`, `pnpm foundry:forge`, and `pnpm render:validate`                                            |

## Security

- Store password and refresh-token hashes only.
- Keep SigNoz, JWT, database, Cloudinary, and AI credentials server-side.
- Do not commit `.env`, generated secrets, Terraform plans, or raw tokens.
- Use least-privilege service accounts and rotate production secrets.

## License

Private.
