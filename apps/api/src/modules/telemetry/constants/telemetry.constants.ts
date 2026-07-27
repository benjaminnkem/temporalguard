export const SPAN_BUSINESS_EVENT_INGESTION =
  'temporalguard.business_event.ingest';
export const SPAN_RULE_EVALUATION = 'temporalguard.rule.evaluate';
export const SPAN_WORKFLOW_CREATED = 'temporalguard.workflow.create';
export const SPAN_WORKFLOW_COMPLETED = 'temporalguard.workflow.complete';
export const SPAN_WORKFLOW_OVERDUE = 'temporalguard.workflow.overdue';
export const SPAN_VIOLATION_CREATED = 'temporalguard.violation.create';
export const SPAN_RULE_MATCHED = 'temporalguard.rule.match';
export const SPAN_BUSINESS_EVENT_RECEIVED =
  'temporalguard.business_event.receive';

export const ATTR_WORKFLOW_ID = 'temporalguard.workflow.id';
export const ATTR_WORKFLOW_STATUS = 'temporalguard.workflow.status';
export const ATTR_RULE_ID = 'temporalguard.rule.id';
export const ATTR_RULE_NAME = 'temporalguard.rule.name';
export const ATTR_EVENT_NAME = 'temporalguard.event.name';
export const ATTR_SEVERITY = 'temporalguard.violation.severity';
export const ATTR_COMPANY_ID_HASH = 'temporalguard.company.id_hash';
export const ATTR_SERVICE_NAME = 'service.name';
export const ATTR_ENVIRONMENT = 'deployment.environment.name';

export const METRIC_WORKFLOWS_STARTED_TOTAL = 'temporalguard.workflows.started';
export const METRIC_WORKFLOWS_COMPLETED_TOTAL =
  'temporalguard.workflows.completed';
export const METRIC_WORKFLOWS_OVERDUE_TOTAL = 'temporalguard.workflows.overdue';
export const METRIC_VIOLATIONS_TOTAL = 'temporalguard.violations';
export const METRIC_ACTIVE_WORKFLOWS = 'temporalguard.workflows.active';
export const METRIC_WORKFLOW_COMPLETION_DURATION =
  'temporalguard.workflow.duration';
export const METRIC_RULE_MATCHES_TOTAL = 'temporalguard.rule.matches';
export const METRIC_EVENTS_INGESTED_TOTAL = 'temporalguard.events.ingested';
export const METRIC_EVENT_INGESTION_ERRORS_TOTAL =
  'temporalguard.event.ingestion.errors';
export const METRIC_EVENT_PROCESSING_DURATION =
  'temporalguard.event.processing.duration';
export const METRIC_INVESTIGATIONS_TOTAL = 'temporalguard.investigations';
export const METRIC_INVESTIGATION_FAILURES_TOTAL =
  'temporalguard.investigation.failures';
export const METRIC_INVESTIGATION_TOOL_CALLS_TOTAL =
  'temporalguard.investigation.tool_calls';
export const METRIC_SIGNOZ_QUERY_FAILURES_TOTAL =
  'temporalguard.signoz.query.failures';
export const METRIC_TELEMETRY_QUALITY = 'temporalguard.telemetry.quality';
export const METRIC_TELEMETRY_MISSING_SIGNALS =
  'temporalguard.telemetry.missing_signals';
