# TemporalGuard Operations Runbook

## Supported topology

The generated root `compose.yaml` and `render.yaml` are deployment artifacts.
Do not edit either by hand. Their sources are:

- `infra/foundry/casting.local.yaml` and
  `infra/foundry/casting.render.yaml`: SigNoz Foundry inputs.
- `infra/foundry/generated/`: Foundry output retained for review.
- `infra/docker/compose.app.yaml`: application Compose services.
- `infra/render/app.yaml`: application Render services.
- `scripts/merge-deployments.mjs`: deterministic, conflict-detecting merger.

The public gateway routes `/api` to the API, `/signoz` to the configured
SigNoz URL, and `/`, `/explorer`, and all other product routes to the web
service. Web and API have no host ports in Compose and are private services on
Render.

## Local lifecycle

Prerequisites are Docker with Compose v2, Node.js 20 or newer, pnpm 9, `curl`,
and enough disk and memory for ClickHouse and SigNoz. Foundry is downloaded,
checksum-verified, and cached automatically.

```sh
cp .env.example .env
pnpm local:up
pnpm local:urls
pnpm demo
pnpm local:down
```

`local:down` retains all volumes. A destructive reset requires an explicit
confirmation argument:

```sh
pnpm local:reset -- --confirm
```

The reset removes only volumes belonging to this Compose project. It cannot be
undone. Never use it on a system whose local data has not been backed up.

| Endpoint      | Default URL                              | Purpose                          |
| ------------- | ---------------------------------------- | -------------------------------- |
| Gateway / web | `http://localhost:8088/`                 | Normal browser entry             |
| API readiness | `http://localhost:8088/api/health/ready` | DB and Redis readiness           |
| Explorer      | `http://localhost:8088/explorer`         | Telemetry explorer               |
| SigNoz route  | `http://localhost:8088/signoz`           | Safe redirect                    |
| SigNoz direct | `http://localhost:3301`                  | Local SigNoz UI                  |
| OTLP HTTP     | `http://localhost:4318`                  | Trace, log, and metric ingestion |
| OTLP gRPC     | `localhost:4317`                         | gRPC ingestion                   |

Useful diagnostics:

```sh
docker compose -f compose.yaml ps --all
docker compose -f compose.yaml logs --tail=200 api worker ingester
docker compose -f compose.yaml logs --tail=200 temporalguard-signoz-signoz-0
curl -fsS http://localhost:8088/api/health/dependencies
```

Migrations run in the one-shot `migrate` service before API and worker start.
A non-zero migration exit blocks both services. Re-run safely with:

```sh
docker compose -f compose.yaml run --rm migrate
```

## Generation and validation

```sh
pnpm foundry:gauge
pnpm foundry:forge
docker compose -f compose.yaml config --quiet
pnpm render:validate
pnpm signoz:fmt
pnpm signoz:validate
```

`foundry:forge` regenerates both official Foundry targets and then merges the
application definitions. `render:validate` uses Render's published JSON Schema
and additional repository checks for duplicate names and broken references.
The official Render CLI additionally needs an authenticated workspace:

```sh
render blueprints validate render.yaml
```

## Render release procedure

The root Blueprint contains the public gateway, private web and API, worker,
managed PostgreSQL, managed Key Value, and the Foundry-generated SigNoz
services and disks. Before creating or updating a Blueprint:

1. Run every generation and validation command above.
2. Set every `sync: false` value in the Render dashboard. In particular,
   `ENCRYPTION_KEY` must be `openssl rand -base64 32`, `FRONTEND_ORIGIN` must
   be the public gateway origin, and both SigNoz public URLs must be exact.
3. Review plan choices, disk sizes, database retention, and the migration.
4. Create a database backup.
5. Deploy only after explicit operator approval.
6. Confirm gateway health, API readiness, worker logs, migration completion,
   OTLP ingestion, and the successful and failed demos.

Do not use Terraform `apply` as part of an application release unless its
generated plan has been reviewed and separately approved. The wrapper enforces
the confirmation flag:

```sh
pnpm signoz:plan
pnpm signoz:apply -- --confirm
```

## Environment contract

| Variable                                            | Scope         | Required behavior                                                                    |
| --------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| `DATABASE_URL`                                      | API, worker   | Render PostgreSQL connection; individual `DB_*` values are the local alternative     |
| `REDIS_URL`                                         | API, worker   | Render Key Value connection; supports credentials and TLS                            |
| `ENCRYPTION_KEY`                                    | API, worker   | Base64-encoded 32-byte key; retain for the lifetime of encrypted connection metadata |
| `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`           | API, worker   | Distinct secrets, at least 16 characters                                             |
| `FRONTEND_ORIGIN`                                   | API           | Exact public gateway origin used by CORS                                             |
| `COOKIE_SECURE`                                     | API           | Must be `true` in production                                                         |
| `OTEL_EXPORTER_OTLP_ENDPOINT`                       | API, worker   | Private Foundry ingester or SigNoz Cloud OTLP endpoint                               |
| `SIGNOZ_MODE`                                       | API, worker   | `self_hosted` or `cloud`                                                             |
| `SIGNOZ_API_URL`                                    | API           | Server-only Query Range endpoint                                                     |
| `SIGNOZ_API_KEY`                                    | API           | Server-only service-account key; never use in browser variables                      |
| `SIGNOZ_UI_URL`                                     | API           | Allowed base for generated deep links                                                |
| `SIGNOZ_INGESTION_ENDPOINT`, `SIGNOZ_INGESTION_KEY` | collector/API | Required together in Cloud mode                                                      |
| `FEATURE_*`                                         | API           | Typed release switches; application Blueprint enables completed features             |
| `AI_PROVIDER`, `AI_API_KEY`, `AI_MODEL`             | worker        | Optional OpenAI-compatible investigation provider; disabled mode is deterministic    |

The complete documented defaults are in `.env.example`; Render-only mapping
examples are in `.env.render.example`. Environment validation fails startup on
unsafe production secrets, malformed URLs, or an invalid encryption key.

## Backups and recovery

Application PostgreSQL is authoritative. Use Render managed backups in
production and verify the plan's retention before launch. Before migrations or
major releases, also take an operator-named logical export:

```sh
docker compose -f compose.yaml exec -T postgres \
  pg_dump -U temporalguard -d temporalguard -Fc > temporalguard.dump
```

Redis contains queues, locks, progress, and caches rather than authoritative
product state, but AOF/persistence is enabled locally and journal-snapshot is
enabled in the Blueprint. Preserve it during an incident when in-flight jobs
matter.

Self-hosted SigNoz has two durable stores: the Foundry metastore PostgreSQL
disk and ClickHouse telemetry disk. Snapshot both at the same maintenance
boundary, using Render disk snapshots or a tested provider-native backup.
Never copy a live ClickHouse data directory as a backup. Telemetry retention
and restore time should be tested independently from the application database.

Run a restore drill at least quarterly: restore into isolated services, run
migrations, check company isolation, query a known telemetry marker, and
record recovery-point and recovery-time results.

## Resource guidance

Foundry's generated Render plans are starting points, not production sizing.
Keep ClickHouse and Keeper on persistent disks and monitor disk usage,
background merges, ingestion rejection, memory, and query latency. Size from
measured event rate, bytes per event, retention, and peak query concurrency.
Do not use free or ephemeral instances for production.

For a small non-production installation, the Blueprint's starter application
services, 1 GB PostgreSQL, and generated SigNoz plans are reasonable. For
production, isolate ingestion from queries, leave memory headroom for
ClickHouse merges, use at least two application instances where the platform
supports it, and load-test before increasing retention. The worker's global
and per-company concurrency must be sized against PostgreSQL, Redis, SigNoz,
and provider rate limits together.

## Verification and incident triage

```sh
pnpm lint
pnpm check-types
pnpm --filter api test -- --runInBand
pnpm --filter api test:e2e --runInBand
pnpm --filter web test
pnpm --filter web test:e2e
pnpm build
pnpm verify:local
pnpm demo
```

For an ingestion incident, check the application exporter, ingester health,
collector queue/retry logs, and ClickHouse health in that order. For an
investigation incident, check API enqueue audit, Redis backlog, worker
readiness, the stable BullMQ job ID, attempt history, and dead-letter status.
Do not manually replay a job until its idempotency key and current database
state have been reconciled.
