# API and Data Contracts

## 1. Conventions

- Base path: `/api/v1`.
- ISO-8601 UTC timestamps.
- Cursor pagination.
- Company scope from authentication.
- Shared Zod-compatible schemas where practical.
- Stable error codes.
- Request correlation ID.
- No SigNoz credentials returned to the browser.

Error:

```json
{
  "error": {
    "code": "INVESTIGATION_ALREADY_RUNNING",
    "message": "An investigation is already running.",
    "details": {},
    "requestId": "req_01"
  }
}
```

---

## 2. Entities

### SigNozConnection

```text
id
companyId nullable for platform connection
mode self_hosted|cloud
name
apiUrl
uiUrl
encryptedApiKey
ingestionEndpoint nullable
status
lastValidatedAt
lastValidationErrorCode
createdBy
createdAt
updatedAt
```

### Investigation

```text
id
companyId
violationId
workflowId
ruleId
status
trigger
configurationHash
requestedBy
startedAt
completedAt
cancelledAt
confidence
summary
topContributor
dataGapCount
evidenceCount
errorCode
errorMessage
createdAt
updatedAt
```

### InvestigationStep

```text
id
investigationId
sequence
type
name
status
inputRedacted
outputSummary
startedAt
completedAt
errorCode
```

### Evidence

```text
id
companyId
investigationId
type
signal
sourceSystem
queryId
title
summary
timeRangeStart
timeRangeEnd
serviceName
serviceVersion
traceId
spanId
measuredValue
unit
confidence
reference
redactedSnapshot
createdAt
```

### AgentRun

```text
id
investigationId
provider
model
policyVersion
maxSteps
status
inputTokenCount nullable
outputTokenCount nullable
startedAt
completedAt
errorCode
```

### AgentToolCall

```text
id
agentRunId
sequence
toolName
inputRedacted
outputEvidenceIds
status
durationMs
errorCode
createdAt
```

### WorkflowComparison

```text
id
companyId
name
status
configuration
cohortASize
cohortBSize
resultSummary
requestedBy
startedAt
completedAt
errorCode
createdAt
```

### RuleSimulation

```text
id
companyId
ruleId nullable
draftSnapshot
draftHash
from
to
status
workflowsEvaluated
wouldComplete
wouldViolate
wouldCompleteLate
result
requestedBy
startedAt
completedAt
errorCode
createdAt
```

### DeploymentObservation

```text
id
companyId
serviceName
environment
version
firstObservedAt
lastObservedAt
source
createdAt
updatedAt
```

### TelemetryQualitySnapshot

```text
id
companyId
scopeType
scopeKey
from
to
score
dimensions
criticalGaps
createdAt
```

---

## 3. Investigation endpoints

```text
GET    /investigations
POST   /violations/:violationId/investigations
GET    /investigations/:id
POST   /investigations/:id/cancel
POST   /investigations/:id/rerun
GET    /investigations/:id/steps
GET    /investigations/:id/evidence
GET    /investigations/:id/graph
GET    /investigations/:id/export
GET    /investigations/:id/stream
```

Start:

```json
{
  "mode": "full",
  "comparison": {
    "enabled": true,
    "successfulSampleSize": 100,
    "violatedSampleSize": 100
  },
  "includeDeploymentAnalysis": true,
  "includeTelemetryQuality": true
}
```

---

## 4. Investigation response

```json
{
  "data": {
    "id": "inv_01",
    "status": "completed",
    "brokenPromise": {
      "ruleName": "Documents must be verified",
      "triggerEvent": "document.uploaded",
      "expectedEvents": [
        "document.scan_completed",
        "document.verification_completed"
      ],
      "missingEvents": ["document.scan_completed"],
      "deadlineAt": "2026-07-24T20:10:00Z"
    },
    "report": {
      "summary": "The strongest correlation is scanner-worker 2.7.1.",
      "confidence": "high",
      "facts": [],
      "contributors": [],
      "dataGaps": [],
      "recommendedChecks": [],
      "recommendedAction": "Pause the rollout and inspect timeout handling.",
      "automaticRemediationPerformed": false
    }
  }
}
```

---

## 5. Evidence Graph

```json
{
  "data": {
    "nodes": [
      {
        "id": "event_1",
        "type": "business_event",
        "label": "document.uploaded",
        "status": "completed",
        "occurredAt": "2026-07-24T20:00:00Z",
        "metadata": {}
      }
    ],
    "edges": [
      {
        "id": "edge_1",
        "source": "event_1",
        "target": "trace_1",
        "type": "linked",
        "confidence": 1
      }
    ],
    "truncated": false
  }
}
```

---

## 6. Comparison endpoints

```text
GET    /comparisons
POST   /comparisons
GET    /comparisons/:id
POST   /comparisons/:id/cancel
GET    /comparisons/:id/stream
```

Request:

```json
{
  "name": "Successful vs violated documents",
  "scope": {
    "ruleId": "rule_01",
    "environment": "production",
    "from": "2026-07-23T00:00:00Z",
    "to": "2026-07-24T00:00:00Z"
  },
  "cohortA": {
    "type": "workflow_status",
    "status": "completed"
  },
  "cohortB": {
    "type": "workflow_status",
    "status": "violated"
  },
  "dimensions": [
    "service_version",
    "trace_duration",
    "error_span_rate",
    "log_pattern",
    "external_call_duration",
    "telemetry_completeness"
  ]
}
```

Result difference:

```json
{
  "dimension": "service_version",
  "key": "scanner-worker@2.7.1",
  "cohortAValue": 0.12,
  "cohortBValue": 0.84,
  "absoluteDifference": 0.72,
  "relativeRatio": 7,
  "interpretation": "correlation",
  "evidenceIds": ["evi_01"]
}
```

---

## 7. Simulation endpoints

```text
POST   /rules/:ruleId/simulations
POST   /rules/simulations
GET    /simulations/:id
POST   /simulations/:id/cancel
GET    /simulations/:id/stream
```

Draft:

```json
{
  "draft": {
    "name": "Documents must finish",
    "triggerEventId": "evt_01",
    "queryType": "sequence",
    "expectedEventIds": ["evt_02", "evt_03"],
    "withinSeconds": 600,
    "correlationProperty": "workflow.id"
  },
  "from": "2026-06-24T00:00:00Z",
  "to": "2026-07-24T00:00:00Z",
  "includeTechnicalEnrichment": true
}
```

---

## 8. Deployment endpoints

```text
GET    /deployments
GET    /deployments/:id
POST   /deployments/:id/analyze
GET    /deployments/:id/analysis
GET    /deployments/:id/stream
```

---

## 9. Telemetry quality

```text
GET    /observability/telemetry-quality
POST   /observability/telemetry-quality/analyze
GET    /observability/telemetry-quality/services/:serviceName
GET    /observability/telemetry-quality/events/:eventId
```

---

## 10. SigNoz connection

```text
GET    /observability/connection
PUT    /observability/connection
POST   /observability/connection/validate
GET    /observability/connection/health
```

Secrets are write-only and masked.

---

## 11. Explorer

```text
POST   /explorer/traces/search
POST   /explorer/logs/search
POST   /explorer/metrics/query
GET    /explorer/attributes
POST   /explorer/signoz-link
```

Safe trace search:

```json
{
  "from": "2026-07-24T19:00:00Z",
  "to": "2026-07-24T20:00:00Z",
  "filters": [
    {
      "field": "service.name",
      "operator": "eq",
      "value": "scanner-worker"
    }
  ],
  "sort": {
    "field": "duration",
    "direction": "desc"
  },
  "limit": 50,
  "cursor": null
}
```

---

## 12. Observability assets

```text
GET    /observability/assets/status
POST   /observability/assets/validate
POST   /observability/assets/plan
POST   /observability/assets/apply
GET    /observability/assets/runs/:id
```

Apply requires explicit authorization.

---

## 13. SSE event types

```text
investigation.queued
investigation.started
investigation.plan.created
investigation.tool.started
investigation.tool.completed
investigation.tool.failed
investigation.analysis.completed
investigation.synthesis.started
investigation.completed
investigation.failed
investigation.cancelled

simulation.started
simulation.progress
simulation.completed
simulation.failed

comparison.started
comparison.progress
comparison.completed
comparison.failed
```

SSE envelope:

```json
{
  "id": "stream_01",
  "type": "investigation.tool.completed",
  "occurredAt": "2026-07-24T20:00:00Z",
  "entityId": "inv_01",
  "sequence": 18,
  "data": {}
}
```

---

## 14. Internal agent tools

### Query traces

```json
{
  "workflowId": "wf_01",
  "traceIds": [],
  "services": [],
  "from": "2026-07-24T19:55:00Z",
  "to": "2026-07-24T20:15:00Z",
  "limit": 200
}
```

### Query logs

```json
{
  "workflowId": "wf_01",
  "traceIds": [],
  "services": [],
  "severity": ["ERROR", "WARN"],
  "from": "2026-07-24T19:55:00Z",
  "to": "2026-07-24T20:15:00Z",
  "limit": 300
}
```

### Compare cohorts

```json
{
  "ruleId": "rule_01",
  "from": "2026-07-23T00:00:00Z",
  "to": "2026-07-24T00:00:00Z",
  "dimensions": ["service_version", "error_span_rate"]
}
```

---

## 15. Pagination

```json
{
  "data": [],
  "page": {
    "nextCursor": "opaque",
    "hasMore": true
  }
}
```

---

## 16. Default limits

```text
Explorer range: 24 hours
Investigation range: workflow window plus 30 minutes
Comparison range: 30 days
Trace rows: 500
Log rows: 1000
Grouped series: 100
Agent tool calls: 10
Concurrent investigations per company: 3
```
