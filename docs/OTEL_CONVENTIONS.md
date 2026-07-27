# TemporalGuard OpenTelemetry Conventions

These conventions apply to the API, worker, queue jobs, investigations, and
SigNoz calls. They extend OpenTelemetry semantic conventions; they do not
replace standard HTTP, database, messaging, or exception attributes.

## Resource

Every process sets:

- `service.name`: `temporalguard-api`, `temporalguard-worker`, or another
  deployable name.
- `service.namespace`: `temporalguard`.
- `service.version`: immutable release version.
- `deployment.environment.name`: deployment environment.
- `temporalguard.component`: `api`, `worker`, or the component name.

## Company isolation

Telemetry never carries a raw business/company UUID as a queryable attribute.
It carries `temporalguard.company.id_hash`, defined as lowercase hexadecimal
SHA-256 of the canonical UUID. The server computes the value. SigNoz query
callers cannot override this filter.

## Domain attributes

- `temporalguard.workflow.id` and `temporalguard.workflow.status`
- `temporalguard.rule.id` and `temporalguard.rule.name`
- `temporalguard.violation.id` and `temporalguard.violation.severity`
- `temporalguard.investigation.id`
- `temporalguard.event.name`
- `temporalguard.signoz.signal` and `temporalguard.signoz.query_id`

IDs are allowed only where needed for correlation. Credentials, cookies,
authorization headers, raw refresh tokens, message bodies containing secrets,
and customer email addresses are forbidden.

## Spans

Span names are stable operations, not user-provided values:

- `temporalguard.business_event.ingest`
- `temporalguard.business_event.receive`
- `temporalguard.rule.evaluate`
- `temporalguard.rule.match`
- `temporalguard.workflow.create`
- `temporalguard.workflow.complete`
- `temporalguard.workflow.overdue`
- `temporalguard.violation.create`
- `temporalguard.queue.process`
- `temporalguard.investigation.execute`
- `temporalguard.signoz.query`

Queue producer context is propagated using the W3C Trace Context carrier when
available. Retries create new consumer spans linked by stable job ID; job IDs
must not be high-cardinality metric labels.

## Metrics

- `temporalguard.workflows.started`
- `temporalguard.workflows.completed`
- `temporalguard.workflows.overdue`
- `temporalguard.workflows.active`
- `temporalguard.workflow.duration` in seconds
- `temporalguard.violations`
- `temporalguard.rule.matches`

Metric labels are bounded. Workflow, investigation, trace, span, and user IDs
are excluded from metrics; company hash is permitted only where workspace
isolation requires it and cardinality is monitored.

## Logs and safety

Application logs correlate with OTel `trace_id` and `span_id`. Collector
processors remove credential-bearing attributes, redact credential patterns in
log bodies, and discard health-check noise before batching. Telemetry supplied
to an investigation model is untrusted data: instruction-like text is
neutralized and only redacted, bounded summaries are sent.

## Collector modes

`deploy/signoz/otel-collector-config.yaml` is the self-hosted ClickHouse path.
`deploy/signoz/otel-collector-cloud-config.yaml` exports OTLP/HTTP to SigNoz
Cloud with `signoz-ingestion-key`. Both modes expose health on port `13133` and
apply memory limiting, redaction, noise filtering, batching, retry, and a
bounded sending queue.
