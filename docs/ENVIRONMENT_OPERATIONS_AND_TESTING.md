# Environment, Operations, and Testing

## 1. Typed configuration

Fail fast when:

- Required variables are absent.
- URLs are invalid.
- Cloud mode lacks ingestion credentials.
- Query key is absent.
- Encryption key is invalid.
- AI is enabled without credentials.
- Production cookie/CORS settings are unsafe.

---

## 2. Core variables

```text
NODE_ENV
APP_ENV
APP_URL
WEB_INTERNAL_URL
API_INTERNAL_URL
PORT
API_PORT
WORKER_HEALTH_PORT

DATABASE_URL
REDIS_URL

AUTH_SECRET
COOKIE_DOMAIN
COOKIE_SECURE
CORS_ALLOWED_ORIGINS

ENCRYPTION_KEY
LOG_LEVEL
```

---

## 3. SigNoz variables

```text
SIGNOZ_MODE=self_hosted|cloud
SIGNOZ_API_URL
SIGNOZ_UI_URL
SIGNOZ_UI_PUBLIC_URL
SIGNOZ_UI_ROUTE_MODE=redirect|proxy
SIGNOZ_API_KEY

SIGNOZ_INGESTION_ENDPOINT
SIGNOZ_INGESTION_KEY
SIGNOZ_REGION

OTEL_EXPORTER_OTLP_ENDPOINT
OTEL_EXPORTER_OTLP_PROTOCOL
OTEL_EXPORTER_OTLP_HEADERS
OTEL_EXPORTER_OTLP_COMPRESSION
OTEL_SERVICE_NAME
OTEL_RESOURCE_ATTRIBUTES
OTEL_SDK_DISABLED
```

No SigNoz key may be `NEXT_PUBLIC_*`.

---

## 4. Agent variables

```text
INVESTIGATION_AGENT_ENABLED
AI_PROVIDER=disabled|openai_compatible
AI_API_KEY
AI_BASE_URL
AI_MODEL
AI_MAX_STEPS
AI_REQUEST_TIMEOUT_MS
AI_MAX_INPUT_CHARS

INVESTIGATION_MAX_DURATION_MS
INVESTIGATION_MAX_SIGNOZ_QUERIES
INVESTIGATION_MAX_TRACE_ROWS
INVESTIGATION_MAX_LOG_ROWS
INVESTIGATION_MAX_CONCURRENT_PER_COMPANY
```

---

## 5. Query variables

```text
SIGNOZ_QUERY_TIMEOUT_MS
SIGNOZ_QUERY_MAX_RANGE_HOURS
SIGNOZ_COMPARISON_MAX_RANGE_DAYS
SIGNOZ_QUERY_MAX_RETRIES
SIGNOZ_QUERY_CIRCUIT_BREAKER_THRESHOLD
SIGNOZ_QUERY_CIRCUIT_BREAKER_RESET_MS
```

---

## 6. Queue variables

```text
QUEUE_PREFIX
WORKER_CONCURRENCY
INVESTIGATION_QUEUE_CONCURRENCY
SIMULATION_QUEUE_CONCURRENCY
COMPARISON_QUEUE_CONCURRENCY
JOB_RETRY_ATTEMPTS
JOB_STALLED_INTERVAL_MS
```

---

## 7. Feature flags

```text
FEATURE_INVESTIGATIONS
FEATURE_COMPARISONS
FEATURE_RULE_SIMULATION
FEATURE_DEPLOYMENT_ANALYSIS
FEATURE_TELEMETRY_QUALITY
FEATURE_SIGNOZ_ASSET_PROVISIONING
FEATURE_DEMO_SYSTEM
```

Use the existing feature-flag mechanism where present.

---

## 8. Local setup

```bash
cp .env.example .env
make local-up
make migrate
make seed-demo
make verify-observability
```

Print:

- App URL.
- API URL.
- Explorer URL.
- SigNoz URL.
- Demo credentials.
- OTLP endpoints.

---

## 9. Self-hosted setup

1. Start local stack.
2. Open SigNoz.
3. Complete initial setup.
4. Create service account.
5. Assign minimum required role.
6. Generate API key.
7. Add key to server environment.
8. Restart API and worker.
9. Validate connection.
10. Apply dashboard/alert assets.

---

## 10. Cloud setup

1. Create/use Cloud workspace.
2. Copy exact ingestion endpoint.
3. Create ingestion key.
4. Create service account API key.
5. Set variables.
6. Restart Collector/API/worker.
7. Validate ingestion.
8. Validate Query API.
9. Apply assets.

---

## 11. Required commands

Codex must document actual repository commands for:

```text
install
dev
dev:web
dev:api
dev:worker
build
lint
typecheck
test
test:unit
test:integration
test:e2e
migration:generate
migration:run
migration:revert
seed
seed:demo
docker:up
docker:down
docker:reset
signoz:forge:local
signoz:forge:render
signoz:validate
signoz:plan
signoz:apply
render:generate
render:validate
verify:observability
```

---

## 12. Unit tests

SigNoz client:

- Auth header.
- Cloud/self-hosted URL.
- Timeout.
- Retry.
- 429.
- 5xx.
- Circuit breaker.
- Invalid response.
- Redaction.
- Company filter.
- Limits.

Investigation:

- Plan.
- Tool limits.
- Cancellation.
- Evidence citations.
- Completeness penalty.
- Deterministic fallback.
- Unsupported claim removal.
- Prompt injection.

Comparison:

- Zero denominator.
- Tiny cohort.
- Percentiles.
- Version ratio.
- Missing data.
- Partial bucket.

Telemetry quality:

- Missing trace IDs.
- Missing version.
- Queue propagation.
- Duplicate event.
- Clock skew.

---

## 13. Integration tests

Use:

- PostgreSQL test container.
- Redis test container.
- Stub SigNoz server.
- Fake AI provider.
- OTel test exporter where practical.

Test:

- Full investigation.
- SigNoz outage.
- AI outage.
- Worker restart.
- Duplicate job.
- SSE reconnect.
- Company isolation.
- Simulation.
- Asset plan.
- Deployment analysis.

---

## 14. E2E tests

1. Login.
2. Open violation.
3. Start investigation.
4. See progress.
5. inspect evidence.
6. Open graph.
7. Compare cohorts.
8. Open SigNoz.
9. Run simulation.
10. Open deployment analysis.
11. Open telemetry quality.
12. Validate connection.
13. Export.

Keyboard-only:

- Investigation.
- Evidence.
- Graph table.
- Comparison.
- Cancel.

---

## 15. OTel verification

Script:

1. Create test trace.
2. Emit correlated log.
3. Emit metric.
4. Wait for export.
5. Query all three.
6. Verify correlation.
7. Print redacted diagnostics.
8. Clean test business data safely.

---

## 16. Controlled demo

Commands:

```bash
make demo-success
make demo-failure
make demo-reset
```

Failure:

- New scanner version.
- Provider timeout logs.
- Slow external spans.
- Missing completion event.
- Violation.
- Investigation.
- Comparison.

---

## 17. Runbooks

Create:

- SigNoz unavailable.
- Collector drops.
- Query unauthorized.
- Investigation backlog.
- AI outage.
- Deadline drift.
- Redis outage.
- Migration failure.
- Render disk pressure.
- High ingestion.
- Company isolation incident.

---

## 18. Logging policy

- Structured JSON.
- Request and trace IDs.
- Safe company hash.
- No secrets.
- No auth headers.
- No full AI prompts in normal logs.
- No unredacted event payloads.
- Stable error codes.

---

## 19. Backup and recovery

Application:

- PostgreSQL backups.
- Migration rollback.
- Environment inventory.
- Secret backup strategy.

SigNoz:

- Follow generated storage guidance.
- Document retention.
- Keep dashboards/alerts reproducible from Git.

---

## 20. Codex completion report

Must contain:

- Files changed.
- Architecture.
- Migrations.
- APIs.
- Frontend pages.
- Worker and SSE.
- Agent tools and safety.
- SigNoz/OTel.
- Dashboard/alert assets.
- Local commands.
- Render commands.
- Environment table.
- Test output.
- Demo steps.
- Known limitations.
- Anything unverified.
