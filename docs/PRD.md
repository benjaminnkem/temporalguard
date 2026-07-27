# Product Requirements Document

## TemporalGuard: SigNoz-Native Business Workflow Observability

**Status:** Implementation specification  
**Project type:** Upgrade to an existing monorepo  
**Primary hackathon positioning:** Build Your Own — observe temporal business
promises with SigNoz.

---

## 1. Executive summary

TemporalGuard already lets companies create business event definitions, receive
event occurrences, define temporal rules, track workflows, and detect
violations.

The upgraded product must detect a broken business promise and immediately
investigate its technical evidence through SigNoz.

Example:

```text
WHEN document.uploaded
EXPECT sequence:
  document.scan_completed
  document.verification_completed
WITHIN 10 minutes
```

When the expected outcome does not arrive, TemporalGuard must:

1. Reconstruct the business event timeline.
2. Find related SigNoz traces and logs.
3. inspect service versions, errors, exceptions, external calls, queues,
   databases, and latency.
4. Compare violated workflows with successful workflows.
5. Identify telemetry gaps.
6. Rank evidence-backed contributing factors.
7. Show exact evidence links.
8. Stream investigation progress.
9. Preserve an auditable investigation record.

The deterministic evidence pipeline is authoritative. An AI model may plan
queries and summarize measured evidence, but it must never invent evidence or
replace the underlying data.

---

## 2. Product definition

TemporalGuard observes temporal guarantees such as:

- Event B must happen after event A.
- At least one of B, C, or D must happen.
- Every required event must happen.
- Events must happen in a defined order.
- A forbidden event must not happen during an observation window.
- A workflow must reach a terminal outcome within a deadline.
- A late outcome may recover the workflow but does not erase the violation.

TemporalGuard answers:

- Which promise broke?
- Which workflow was affected?
- What was expected?
- What occurred?
- How late was it?
- Did it recover?
- How many similar workflows are affected?

SigNoz answers:

- Which services and versions participated?
- Which traces, spans, logs, metrics, and exceptions are relevant?
- What differs between successful and violated workflows?
- Did a deployment precede the regression?
- Was a queue, database, or external dependency involved?
- Is the telemetry complete enough to trust the conclusion?

---

## 3. Goals

### Primary goals

- Make SigNoz a core investigation engine rather than a simple external link.
- Build a complete agent-native investigation workflow.
- Support self-hosted SigNoz and SigNoz Cloud.
- Run the complete local system through Docker Compose.
- Deploy the complete hosted system through a Render Blueprint.
- Preserve company isolation.
- Support real-time progress and high-volume processing.
- Make every claim evidence-backed.
- Keep the product useful when the AI provider is unavailable.

### Secondary goals

- Detect telemetry quality problems.
- Compare service versions and deployment windows.
- Generate reusable SigNoz dashboard and alert assets.
- Provide a deterministic hackathon demo.
- Observe TemporalGuard's own ingestion and processing system.

---

## 4. Existing behavior to preserve

Codex must audit and preserve:

- Authentication.
- Company membership and authorization.
- Company profile and logo.
- Events Catalogue.
- Inline event creation in the Query Builder.
- Event occurrence and rule-usage counts.
- Rule CRUD.
- `any`, `all`, `sequence`, and `forbid`.
- Workflow list and detail.
- Violation list and detail.
- Existing analytics dashboards.
- Dark and light modes.
- Existing database records and migrations.
- Existing local SigNoz functionality.

If frontend and backend product behavior conflict, preserve the intended
frontend experience and upgrade the backend to support it.

No destructive rewrite is allowed without a documented data migration.

---

## 5. Core capabilities

## 5.1 Workflow Evidence Graph

A TemporalGuard workflow can span multiple traces and asynchronous boundaries.

Required node types:

- Business event.
- Expected event.
- Missing event.
- Forbidden event.
- Workflow transition.
- Trace.
- Span.
- Service.
- Queue operation.
- Database operation.
- External dependency.
- Exception.
- Deployment version.
- Alert.
- Telemetry gap.

Required edge types:

- Occurred after.
- Parent/child.
- Producer/consumer.
- Same workflow.
- Same trace.
- Produced by service.
- Associated with deployment.
- Missing expected transition.
- Inferred relationship.

Required behavior:

- Business-only and technical-expanded modes.
- Timeline and graph modes.
- Service clustering.
- Node detail drawer.
- Confidence for inferred edges.
- Explicit missing links.
- Search and fit-to-view.
- “Open in SigNoz” actions.
- Keyboard navigation.
- Accessible table alternative.
- Large-graph limits and clustering.

---

## 5.2 Violation Investigation Workspace

Every violation can have multiple investigation runs.

States:

- Pending.
- Queued.
- Running.
- Waiting for telemetry.
- Completed.
- Completed with gaps.
- Failed.
- Cancelled.
- Superseded.

Sections:

1. Broken promise.
2. Business event timeline.
3. Agent plan.
4. Live tool execution.
5. Evidence Graph.
6. Ranked contributors.
7. Successful-versus-violated comparison.
8. Deployment impact.
9. Telemetry completeness.
10. Recommended checks.
11. SigNoz evidence links.
12. Audit trail.

Actions:

- Start.
- Cancel.
- Rerun.
- Compare runs.
- Add operator note.
- Export Markdown or JSON.
- Share stable URL.
- Open workflow, violation, trace, logs, or service evidence.

---

## 5.3 Guard investigation agent

The agent is an SRE copilot specialized in TemporalGuard violations.

Rules:

- Use only registered internal tools.
- Enforce maximum steps and duration.
- Persist every tool call.
- Cite evidence IDs for every claim.
- Label correlation as correlation.
- State missing data.
- Treat telemetry as untrusted content.
- Never execute remediation.
- Never expose secrets or sensitive attributes.
- Support cancellation.
- Work in deterministic evidence-only mode when AI is disabled.

Approved tools:

- Load violation and rule context.
- Load workflow event timeline.
- Query SigNoz traces.
- Query SigNoz logs.
- Query SigNoz metrics.
- Aggregate errors and durations.
- Retrieve observed deployments and service versions.
- Compare successful and violated cohorts.
- Calculate telemetry completeness.
- Retrieve related TemporalGuard alerts and violation clusters.
- Build safe SigNoz links.
- Produce a structured report.

Final report schema:

- Summary.
- Confidence.
- Measured facts.
- Ranked contributors.
- Evidence references.
- Data gaps.
- Alternative explanations.
- Recommended checks.
- Recommended human action.
- `automaticRemediationPerformed: false`.

---

## 5.4 Successful-versus-violated comparison

Default comparisons:

- Successful versus violated.
- Successful versus completed late.
- Before deployment versus after deployment.
- Version A versus version B.
- Environment A versus environment B.
- Current period versus previous period.

Dimensions:

- Workflow count.
- Completion rate.
- Completion duration.
- Transition duration.
- Missing business events.
- Trace duration.
- Span count.
- Error span rate.
- Exception and log-pattern frequency.
- Service participation.
- Service version.
- External dependency latency.
- Database latency.
- Queue delay.
- Retry count.
- Missing spans.
- Telemetry completeness.

Statistical requirements:

- Show sample size.
- Warn on tiny cohorts.
- Show absolute difference and relative ratio.
- Handle zero denominators.
- Prefer p50/p95/p99 for latency.
- Mark partial buckets.
- Separate descriptive correlation from causal claims.
- Persist the exact comparison configuration.

---

## 5.5 Historical rule simulation

A rule draft can be tested against historical TemporalGuard events.

Output:

- Workflows evaluated.
- Would complete.
- Would violate.
- Would complete late.
- Unrecovered violations.
- Completion rate.
- Median, p90, p95, and p99 duration.
- Service/version breakdown where telemetry exists.
- Telemetry completeness.
- Sample successful workflows.
- Sample violated workflows.
- Suggested deadline.
- Insufficient-sample warning.

Behavior:

- Async job.
- Progress stream.
- Cancellable.
- Immutable draft snapshot.
- Does not mutate live workflow state.
- Results stored and comparable.
- Marks stale results after material schema changes.

---

## 5.6 Deployment impact analysis

Observe service version changes through OTel resource attributes and existing
deployment records.

Output:

- Service.
- Previous and new version.
- First observed timestamp.
- Workflow volume before/after.
- Completion rate before/after.
- Violation rate before/after.
- p95 duration before/after.
- New exceptions.
- Changed trace paths.
- Changed event schemas.
- Affected rules and workflow types.
- Confidence and sample sizes.

Recommendation states:

- Healthy.
- Observe.
- Investigate.
- Pause recommended.
- Insufficient evidence.

No automatic rollback.

---

## 5.7 Telemetry completeness

Checks:

- Event ID.
- Workflow ID.
- Workflow type.
- Event name.
- Occurred timestamp.
- Service name.
- Service version.
- Deployment environment.
- Trace ID.
- Span ID.
- Correlation properties.
- Queue context propagation.
- Producer/consumer links.
- Trace/log correlation.
- Duplicate rate.
- Clock skew.

Output:

- Overall score.
- Service score.
- Event score.
- Environment score.
- Critical gaps.
- Investigation impact.
- Recommended instrumentation fixes.

---

## 5.8 Event-ingestion observability

Observe:

- Request accepted.
- Authentication.
- Company resolution.
- Normalization.
- Schema validation.
- Deduplication.
- Persistence.
- Queue publication.
- Rule matching.
- Workflow transition.
- Deadline scheduling.
- Violation creation.
- OTel export.
- Real-time publication.

Metrics:

- Received.
- Accepted.
- Rejected.
- Duplicate.
- Unknown.
- Schema failure.
- Out-of-order.
- Late.
- Queue depth and age.
- Processing duration.
- Rule evaluation duration.
- Workflow state write duration.
- Deadline worker drift.
- Investigation backlog and duration.
- SigNoz query latency/failure.
- AI provider latency/failure.
- SSE connections/reconnects.

---

## 5.9 SigNoz observability pack

Dashboards:

- TemporalGuard Platform Health.
- Workflow Reliability.
- Violation Investigation.
- Event Ingestion.
- Investigation Agent.
- Telemetry Completeness.
- Deployment Impact.

Alerts:

- Event rejection rate.
- Ingestion backlog.
- Deadline worker drift.
- Workflow violation rate.
- Near-deadline backlog.
- No workflow completions.
- SigNoz query failures.
- Investigation backlog/failure.
- Telemetry completeness regression.

Use version-controlled assets and the official SigNoz Terraform provider.

---

## 5.10 Native Explorer

Route:

```text
/explorer
```

Modes:

- Workflows.
- Traces.
- Logs.
- Services.
- Deployments.
- Telemetry gaps.

Filters:

- Time range.
- Environment.
- Workflow ID.
- Rule ID.
- Event.
- Service.
- Version.
- Severity.
- Duration.
- Error state.

The browser must use safe structured APIs. It must not submit arbitrary
ClickHouse SQL.

---

## 6. Navigation

```text
Overview
Live Workflows
Events
Rules
Violations
Investigations
Comparisons
Explorer
Services
Deployments
Observability
  Connection
  Platform Health
  Telemetry Quality
  Dashboard Pack
Settings
```

Adapt the existing navigation rather than duplicating routes.

---

## 7. Backend requirements

Implement:

- Typed SigNoz Query Range client.
- Service-account key authentication.
- Cloud/self-hosted configuration.
- Timeouts.
- Cancellation.
- Retry for transient idempotent requests.
- Circuit breaker.
- Query allowlists.
- Result limits.
- Server-enforced company filters.
- Redaction.
- Query audit records.
- Durable jobs.
- PostgreSQL investigation state.
- Redis progress fan-out.
- SSE.
- Company isolation.
- Encrypted connection secrets.
- Structured errors.
- OTel instrumentation.

Do not allow browser-provided raw SQL or untrusted unrestricted SigNoz filters.

---

## 8. Security

- SigNoz credentials remain server-side.
- Company scope is derived from authentication.
- Integration secrets are encrypted at rest.
- Queries have bounded ranges and row limits.
- Telemetry content is treated as untrusted.
- PII and secrets are redacted before storage or AI use.
- Prompt injection in logs or spans cannot alter agent policy.
- Exports require authorization.
- Agent cannot call arbitrary URLs.
- No cross-company evidence.
- No automatic remediation.

---

## 9. Scalability

- Cursor pagination.
- Company-scoped indexes.
- Time-range indexes.
- Async investigation.
- Per-company concurrency limits.
- Idempotent jobs.
- Backpressure.
- Retry with jitter.
- Dead-letter state.
- Query caching where safe.
- Browser table virtualization.
- Graph clustering.
- SSE coalescing.
- Graceful shutdown.

Store both `occurredAt` and `receivedAt`.

---

## 10. Local deployment

One command must start:

- Gateway.
- Next.js web.
- NestJS API.
- NestJS worker.
- PostgreSQL.
- Redis.
- OTel Collector.
- Self-hosted SigNoz and dependencies.

Use SigNoz Foundry to generate the current supported Compose output.

Routes:

- `/`
- `/api`
- `/explorer`
- `/signoz`

---

## 11. Render deployment

Provide a Blueprint or deterministic generator containing:

- Public gateway.
- Private web.
- Private API.
- Worker.
- Managed PostgreSQL.
- Render Key Value.
- SigNoz services generated by Foundry.
- Required disks.
- Health checks.
- Migrations.

Support:

- `SIGNOZ_MODE=self_hosted`
- `SIGNOZ_MODE=cloud`

Switching modes must not require source changes.

---

## 12. Test requirements

Unit:

- SigNoz query construction.
- Redaction.
- Evidence ranking.
- Cohort statistics.
- Completeness score.
- Agent output validation.
- Company filtering.
- Deployment comparison.
- Graph construction.

Integration:

- Stub SigNoz server.
- Full investigation.
- Cancellation.
- Retry and circuit breaker.
- Worker recovery.
- SSE resume.
- Rule simulation.
- AI-disabled mode.
- Alert/dashboard validation.

E2E:

1. Login.
2. Open violation.
3. Start investigation.
4. Watch progress.
5. Inspect Evidence Graph.
6. Compare cohorts.
7. Open SigNoz evidence.
8. Run rule simulation.
9. Inspect deployment impact.
10. Inspect telemetry completeness.
11. Export report.
12. Verify cross-company isolation.

Infrastructure:

- Compose config.
- Collector dry run.
- Foundry gauge and forge.
- Terraform fmt and validate.
- Empty-database migration.
- Production builds.
- Health checks.
- OTel trace/log/metric arrival.

---

## 13. Controlled demo

Business events:

```text
document.uploaded
document.scan_started
document.scan_completed
document.verification_completed
```

Failure:

- New scanner version.
- Provider timeout logs.
- Slow external spans.
- Missing `document.scan_completed`.
- Queue and database remain healthy.
- Successful workflows use the old version.

The demo must show:

- Rule.
- Successful workflow.
- Failed workflow.
- Violation.
- Live investigation.
- Evidence Graph.
- Cohort comparison.
- Deployment correlation.
- SigNoz traces/logs/metrics.
- Telemetry completeness.
- Evidence-backed agent summary.

---

## 14. Acceptance criteria

Complete only when:

- Existing product still works.
- Local full Compose starts.
- Render Blueprint validates.
- Cloud/self-hosted switching works.
- Telemetry reaches SigNoz.
- Backend can query SigNoz.
- Evidence Graph works.
- Investigation is durable and streamed.
- Every agent claim cites evidence.
- Comparison works.
- Simulation works.
- Deployment analysis works.
- Telemetry completeness works.
- Platform health uses real data.
- Dashboard and alert assets validate.
- `/explorer`, `/api`, and `/signoz` behavior work.
- Tests, lint, typecheck, and builds pass.
- Migrations work from an empty database.
- No required feature uses mock production data.
- Setup and environment variables are documented.
- Unverified items are disclosed honestly.

---

## 15. Final pitch

TemporalGuard is an agent-native business workflow observability platform
powered by OpenTelemetry and SigNoz. It detects when real-world processes fail
to reach promised outcomes, reconstructs evidence across events, traces, logs,
metrics, services, queues, and deployments, compares broken workflows with
successful ones, and gives engineers an auditable, evidence-backed
investigation.
