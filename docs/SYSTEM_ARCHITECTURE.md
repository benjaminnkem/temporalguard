# System Architecture

## 1. Objective

Upgrade the existing monorepo without replacing working product domains. The
new system must be modular, horizontally scalable, observable, secure, and
deployable locally and on Render.

---

## 2. Recommended monorepo layout

Adapt to existing names.

```text
apps/
  web/                   Next.js product UI
  api/                   NestJS HTTP and SSE API
  worker/                NestJS background worker
  demo-system/           Controlled success/failure generator

packages/
  contracts/             Shared schemas and types
  observability/         OTel bootstrap and conventions
  signoz-client/         Typed SigNoz adapter
  investigation-engine/  Evidence ranking and comparisons
  config/                Typed environment configuration
  test-utils/

infra/
  gateway/
  otel/
  signoz/
    casting.local.yaml
    casting.render.yaml
    generated/
    terraform/
  render/
  docker/

scripts/
```

---

## 3. Runtime topology

```text
Browser
  |
Gateway
  |---- web
  |---- API
  |---- /signoz redirect
  |
API ---- PostgreSQL
  |---- Redis
  |---- SigNoz Query API
  |---- OTel Collector
  |---- AI provider
  |
Redis queues
  |
Worker ---- PostgreSQL
       ---- SigNoz Query API
       ---- AI provider
       ---- OTel Collector

API/worker telemetry
  |
OTel Collector
  |
self-hosted SigNoz or SigNoz Cloud
```

---

## 4. Service responsibilities

### Web

- Product pages.
- Investigations.
- Evidence Graph.
- Comparisons.
- Explorer.
- Deployment impact.
- Platform health.
- SSE clients.
- URL-driven filters.

Must not hold SigNoz credentials or construct unrestricted queries.

### API

- Auth and company scope.
- CRUD and query endpoints.
- Investigation/simulation/comparison commands.
- SSE.
- Safe evidence APIs.
- SigNoz connection validation.
- Audit.
- Asset planning and apply commands.

### Worker

- Investigation jobs.
- Simulations.
- Comparisons.
- Deployment analysis.
- Telemetry completeness.
- Export generation.
- Long-running provisioning.

### Demo system

- Successful workflow.
- Failed workflow.
- OTel traces/logs/metrics.
- Version markers.
- Controlled provider timeout.

Disabled in production by default.

---

## 5. Backend modules

```text
AuthModule
CompaniesModule
EventsModule
RulesModule
WorkflowsModule
ViolationsModule
InvestigationsModule
EvidenceModule
ComparisonsModule
SimulationsModule
DeploymentsModule
TelemetryQualityModule
SigNozModule
ObservabilityAssetsModule
RealtimeModule
AuditModule
ExportsModule
HealthModule
```

---

## 6. Investigation flow

```text
Violation created
  -> Investigation requested
  -> Row created transactionally
  -> Durable job enqueued
  -> Worker loads context
  -> SigNoz traces queried
  -> SigNoz logs queried
  -> SigNoz metrics queried
  -> Cohorts compared
  -> Telemetry quality scored
  -> Contributors ranked
  -> Optional AI synthesis
  -> Report persisted
  -> Progress streamed
```

Violation creation must never wait for SigNoz or the AI provider.

---

## 7. Durable jobs

Recommended queues:

- `investigations`
- `rule-simulations`
- `comparisons`
- `deployment-analysis`
- `exports`
- `signoz-provisioning`

Each job needs:

- Stable ID.
- Company ID.
- Entity ID.
- Requester.
- Timeout.
- Retry.
- Cancellation.
- Progress.
- Dead-letter state.
- Correlation ID.

Example idempotency keys:

```text
investigation:{violationId}:{configHash}
simulation:{draftHash}:{from}:{to}
comparison:{cohortHash}:{from}:{to}
deployment:{service}:{version}:{windowHash}
```

---

## 8. Company isolation

Every new table must include or be reachable through `companyId`.

Shared SigNoz telemetry must include a trusted company attribute such as:

```text
temporalguard.company.id_hash
```

The backend computes and enforces the filter. The frontend never supplies the
authoritative company scope.

Support a future company-managed SigNoz connection by storing encrypted
connection metadata.

---

## 9. Storage

### PostgreSQL

Source of truth for:

- Business state.
- Violations.
- Investigations.
- Evidence references.
- Agent runs.
- Simulations.
- Comparisons.
- Deployments.
- Audit.

### Redis

- Job queue.
- Progress fan-out.
- Short-lived locks.
- Rate limits.
- Safe caches.

### SigNoz

- Traces.
- Logs.
- Metrics.
- Exceptions.
- Technical telemetry history.
- Alerts and dashboards.

Do not copy all raw telemetry into PostgreSQL.

---

## 10. Evidence model

Evidence types:

- Fact.
- Correlation.
- Difference.
- Absence.
- Telemetry gap.
- Deployment marker.
- Query failure.
- Operator note.

Each record should carry:

- Investigation.
- Signal.
- Query ID.
- Time range.
- Service/version.
- Trace/span identifiers.
- Measured value.
- Unit.
- Confidence.
- Safe reference.
- Redacted snapshot.

---

## 11. Evidence ranking

Calculate deterministic scores before AI synthesis.

Possible components:

- Version overrepresentation.
- Error-pattern difference.
- p95 latency difference.
- Missing-span difference.
- Deployment proximity.
- Service concentration.
- External dependency difference.
- Telemetry completeness penalty.

Never present the score as a scientifically proven root-cause probability.

---

## 12. Agent architecture

```text
InvestigationOrchestrator
  -> policy and limits
  -> registered tool set
  -> plan
  -> tool execution
  -> evidence store
  -> deterministic analysis
  -> optional AI synthesis
  -> schema validation
```

Tools use structured validated input, server-owned query templates, bounded
ranges, timeouts, output limits, redaction, and tracing.

AI receives only selected redacted evidence.

---

## 13. Real-time architecture

SSE endpoints:

```text
/api/v1/investigations/:id/stream
/api/v1/simulations/:id/stream
/api/v1/live/workflows/stream
/api/v1/live/violations/stream
```

Requirements:

- `Last-Event-ID`.
- Monotonic sequence.
- Durable reconciliation.
- Redis fan-out.
- Duplicate protection.
- Reconnect.
- High-frequency coalescing.
- Authorization on connect and reconnect.

---

## 14. OTel architecture

Applications export to a gateway Collector.

Collector responsibilities:

- Memory limiting.
- Resource enrichment.
- Attribute normalization.
- Redaction.
- Filtering.
- Batching.
- Retry and queueing.
- Export to selected SigNoz mode.
- Health endpoint.

Instrumentation code must not change when switching modes.

---

## 15. Reverse proxy

Routes:

- `/` -> web.
- `/api/*` -> API.
- `/explorer/*` -> web.
- `/signoz` -> redirect by default.

Proxy mode for `/signoz` is allowed only after testing assets, login, API calls,
websockets, nested refresh, and prefix escape.

---

## 16. Render topology

Public:

- `temporalguard-gateway`.

Private:

- `temporalguard-web`.
- `temporalguard-api`.

Background:

- `temporalguard-worker`.

Managed:

- PostgreSQL.
- Render Key Value.

SigNoz:

- Generate with Foundry.
- Merge with app Blueprint deterministically.
- Preserve generated disks and dependencies.

---

## 17. Failure behavior

### SigNoz down

- Workflow monitoring continues.
- Violations continue.
- Investigations wait or fail clearly.
- Retry is bounded.
- No business event loss.

### AI down

- Evidence collection continues.
- Comparison continues.
- Deterministic report is shown.
- AI state is visible.

### Redis down

- Reads continue where possible.
- Long-running commands fail clearly or recover.
- PostgreSQL preserves requests.

### Worker crash

- Job is retried.
- Idempotent steps avoid duplicate evidence.
- Stale leases expire.

---

## 18. Migration strategy

1. Audit entities.
2. Add tables without deleting old fields.
3. Backfill trace references and company scope where possible.
4. Add indexes safely.
5. Deploy dual-read compatibility if needed.
6. Run backfills.
7. Enable features.
8. Remove obsolete fields only later.

---

## 19. Health

Gateway:

- `/healthz`.

API:

- `/health/live`.
- `/health/ready`.
- `/health/dependencies`.

Worker:

- Health port or heartbeat.
- Queue lag.
- Last completed job.

Collector:

- Health extension.

SigNoz:

- Official health endpoint.

---

## 20. Self-observability

Instrument:

- HTTP.
- Database.
- Queue publish/consume.
- Investigation phases.
- SigNoz queries.
- AI calls.
- SSE.
- Provisioning.
- Exports.
- Migrations.
- Demo failure injection.
