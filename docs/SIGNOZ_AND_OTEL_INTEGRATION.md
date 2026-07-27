# SigNoz and OpenTelemetry Integration

## 1. Principles

- OpenTelemetry is the instrumentation and transport standard.
- SigNoz is the technical telemetry backend.
- PostgreSQL remains the source of TemporalGuard business state.
- Only the backend talks to the SigNoz Query API.
- Cloud and self-hosted modes use the same domain adapter.
- Public documented APIs and stable infrastructure-as-code mechanisms are
  preferred over private UI endpoints.
- Every query is company-scoped, bounded, audited, and redacted.

---

## 2. Deployment modes

### Self-hosted

```text
SIGNOZ_MODE=self_hosted
SIGNOZ_API_URL=http://signoz:8080
SIGNOZ_UI_URL=http://signoz:8080
OTEL_EXPORTER_OTLP_ENDPOINT=http://signoz-otel-collector:4317
OTEL_EXPORTER_OTLP_PROTOCOL=grpc
```

Self-hosted ingestion does not require a SigNoz ingestion key by default. Query
API access still uses a SigNoz service-account key.

### Cloud

```text
SIGNOZ_MODE=cloud
SIGNOZ_API_URL=https://<workspace>.signoz.cloud
SIGNOZ_UI_URL=https://<workspace>.signoz.cloud
SIGNOZ_INGESTION_ENDPOINT=https://ingest.<region>.signoz.cloud:443
SIGNOZ_INGESTION_KEY=<key>
SIGNOZ_API_KEY=<service-account-key>
```

The exact ingestion endpoint must be copied from the workspace settings.

---

## 3. Semantic conventions

### Resource attributes

```text
service.name
service.version
deployment.environment
service.namespace=temporalguard
temporalguard.component=web|api|worker|demo
```

### Workflow attributes

```text
temporalguard.workflow.id
temporalguard.workflow.type
temporalguard.rule.id
temporalguard.violation.id
temporalguard.investigation.id
temporalguard.event.name
temporalguard.event.id
temporalguard.event.domain
temporalguard.event.outcome
temporalguard.company.id_hash
```

Avoid raw emails, names, document data, tokens, or secrets.

### Span names

```text
temporalguard.event.ingest
temporalguard.event.validate
temporalguard.event.persist
temporalguard.rule.evaluate
temporalguard.workflow.transition
temporalguard.deadline.schedule
temporalguard.violation.create
temporalguard.investigation.run
temporalguard.signoz.query
temporalguard.comparison.calculate
temporalguard.simulation.run
```

---

## 4. Collector gateway

Recommended processor order:

1. Memory limiter.
2. Resource detection/enrichment.
3. Attribute normalization.
4. Redaction/filtering.
5. Sampling where appropriate.
6. Batch.
7. Export.

Conceptual configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 512
    spike_limit_mib: 128

  resource/temporalguard:
    attributes:
      - key: service.namespace
        value: temporalguard
        action: upsert

  transform/redact:
    error_mode: ignore

  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlp/signoz_local:
    endpoint: signoz-otel-collector:4317
    tls:
      insecure: true
    sending_queue:
      enabled: true
      queue_size: 5000
    retry_on_failure:
      enabled: true

  otlphttp/signoz_cloud:
    endpoint: ${env:SIGNOZ_INGESTION_ENDPOINT}
    headers:
      signoz-ingestion-key: ${env:SIGNOZ_INGESTION_KEY}
    compression: gzip
    sending_queue:
      enabled: true
      queue_size: 5000
    retry_on_failure:
      enabled: true
```

Use separate rendered mode-specific configurations rather than depending on
unsupported dynamic YAML behavior.

---

## 5. Query API adapter

Use the documented endpoint:

```text
POST {SIGNOZ_API_URL}/api/v5/query_range
SIGNOZ-API-KEY: <service-account-key>
```

Typed interface:

```ts
interface SigNozQueryClient {
  queryTraces(input: TraceQuery): Promise<TraceQueryResult>;
  queryLogs(input: LogQuery): Promise<LogQueryResult>;
  queryMetrics(input: MetricQuery): Promise<MetricQueryResult>;
  validateConnection(): Promise<ConnectionHealth>;
}
```

Safety:

- Backend-owned templates.
- Allowlists for fields/operators.
- Trusted company filter.
- Maximum range.
- Maximum rows/groups.
- Timeout and cancellation.
- Result schema validation.
- Redaction.
- Query audit.
- No raw SQL from the browser.

---

## 6. Query patterns

### Workflow traces

Filter by trusted company hash and workflow ID. Also query explicit trace IDs
stored on events.

### Workflow logs

Filter by workflow, trace ID, service, time, and severity.

### Service latency

Aggregate duration by:

- Service.
- Version.
- Operation.
- Environment.
- Cohort.

### Errors

Calculate:

- Error span count/rate.
- Error log count/rate.
- Exception fingerprint count.
- First/last occurrence.
- Relative frequency between cohorts.

### Deployments

Group by:

```text
service.name
service.version
deployment.environment
```

---

## 7. Evidence links

Implement `SigNozLinkBuilder`.

Inputs:

- UI URL.
- Signal.
- Time range.
- Filter.
- Trace ID.
- Service.
- Environment.

Rules:

- Prefer documented explorer URL mechanisms.
- Fall back to generic SigNoz UI.
- Version link templates.
- Unit-test links.
- Never place credentials in URLs.
- Keep `/signoz` as a stable TemporalGuard entry route.

---

## 8. Dashboard and alert assets

Use the official SigNoz Terraform provider.

```text
infra/signoz/terraform/
  versions.tf
  provider.tf
  variables.tf
  dashboards/
  alerts/
  outputs.tf
```

Provider variables:

```text
SIGNOZ_ENDPOINT
SIGNOZ_ACCESS_TOKEN
```

Dashboards:

- Platform Health.
- Workflow Reliability.
- Violation Investigation.
- Event Ingestion.
- Investigation Agent.
- Telemetry Completeness.
- Deployment Impact.

Variables:

```text
environment
workflow_type
rule_id
service_name
service_version
company_hash
```

Use the documented SigNoz alert API only for explicit user-approved runtime
alert creation.

---

## 9. Rule-to-observability plan

For each rule, generate a product-side plan containing:

- Trigger volume.
- Valid outcome volume.
- Completion rate.
- Deadline consumption.
- Completion duration histogram.
- Violation volume.
- Missing event breakdown.
- Service/version breakdown.
- Trace filters.
- Log filters.
- Suggested alerts.

Use a generic variable-driven SigNoz dashboard instead of one dashboard per
rule.

---

## 10. Simulation enrichment

TemporalGuard event storage is authoritative for event order and rule outcome.

SigNoz enriches a simulation with:

- Services.
- Versions.
- Trace errors.
- Log patterns.
- External call duration.
- Queue/database evidence.
- Telemetry completeness.

A SigNoz outage must not prevent pure business-event simulation.

---

## 11. Telemetry quality queries

Calculate:

- Events with trace ID.
- Events with span ID.
- Events with service version.
- Events with environment.
- Producer spans without consumer links.
- Logs with workflow ID but no trace ID.
- Trace IDs missing in the searched window.
- Clock skew between occurred and received timestamps.

---

## 12. Cloud versus self-hosted

Ingestion differences:

- Cloud uses TLS, its workspace endpoint, and ingestion-key header.
- Self-hosted uses local OTLP ports and no ingestion key by default.

Query API:

- Both use a service-account key.

Browser:

- Does not query SigNoz directly.

---

## 13. Collector health

Monitor:

- Health endpoint.
- Export failures.
- Sending queue.
- Dropped telemetry.
- Batch duration.
- Memory limiter action.
- Receiver throughput.

---

## 14. Sampling

Always retain:

- Error traces.
- Critical TemporalGuard spans.
- Violation/investigation traces.
- Slow traces.
- Demo failure traces.

A workflow may violate after an original trace ends. Persist trace IDs on
workflow events and retain sufficient boundary telemetry.

---

## 15. Foundry

Local casting:

```yaml
apiVersion: v1alpha1
kind: Installation
metadata:
  name: temporalguard-signoz-local
spec:
  deployment:
    flavor: compose
    mode: docker
```

Render casting:

```yaml
apiVersion: v1alpha1
metadata:
  name: temporalguard-signoz-render
spec:
  deployment:
    flavor: blueprint
    platform: render
```

Do not manually edit Foundry-generated files.

---

## 16. Connection validation

The connection page should:

1. Validate API key.
2. Run a tiny metric query.
3. Run a tiny trace query.
4. Run a tiny log query.
5. Check application OTLP export health.
6. Check dashboard/alert asset state.
7. Return redacted diagnostics.

---

## 17. Retention

Investigations store:

- Evidence summary.
- Query/time range.
- Stable IDs.
- Redacted snapshot needed for audit.

When raw telemetry expires, the report remains and states that original
evidence is outside retention.
