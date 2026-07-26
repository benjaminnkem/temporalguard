import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  trace,
  metrics,
  context,
  SpanStatusCode,
  Tracer,
  Meter,
  Counter,
  UpDownCounter,
  Histogram,
  Attributes,
  Span,
} from '@opentelemetry/api';
import {
  logs,
  Logger,
  SeverityNumber,
  type AnyValueMap,
} from '@opentelemetry/api-logs';
import { createHash } from 'node:crypto';
import {
  SPAN_WORKFLOW_CREATED,
  SPAN_WORKFLOW_COMPLETED,
  SPAN_WORKFLOW_OVERDUE,
  SPAN_VIOLATION_CREATED,
  SPAN_RULE_MATCHED,
  SPAN_BUSINESS_EVENT_RECEIVED,
  ATTR_WORKFLOW_ID,
  ATTR_WORKFLOW_STATUS,
  ATTR_RULE_ID,
  ATTR_RULE_NAME,
  ATTR_EVENT_NAME,
  ATTR_SEVERITY,
  ATTR_SERVICE_NAME,
  ATTR_ENVIRONMENT,
  METRIC_WORKFLOWS_STARTED_TOTAL,
  METRIC_WORKFLOWS_COMPLETED_TOTAL,
  METRIC_WORKFLOWS_OVERDUE_TOTAL,
  METRIC_VIOLATIONS_TOTAL,
  METRIC_ACTIVE_WORKFLOWS,
  METRIC_WORKFLOW_COMPLETION_DURATION,
  METRIC_RULE_MATCHES_TOTAL,
  ATTR_COMPANY_ID_HASH,
  METRIC_EVENTS_INGESTED_TOTAL,
  METRIC_EVENT_INGESTION_ERRORS_TOTAL,
  METRIC_EVENT_PROCESSING_DURATION,
  METRIC_INVESTIGATIONS_TOTAL,
  METRIC_INVESTIGATION_FAILURES_TOTAL,
  METRIC_INVESTIGATION_TOOL_CALLS_TOTAL,
  METRIC_SIGNOZ_QUERY_FAILURES_TOTAL,
  METRIC_TELEMETRY_QUALITY,
  METRIC_TELEMETRY_MISSING_SIGNALS,
} from '../constants/telemetry.constants';

@Injectable()
export class TelemetryService {
  private readonly tracer: Tracer;
  private readonly meter: Meter;
  private readonly logger: Logger;
  private readonly serviceName: string;
  private readonly environment: string;

  private readonly workflowsStartedCounter: Counter;
  private readonly workflowsCompletedCounter: Counter;
  private readonly workflowsOverdueCounter: Counter;
  private readonly violationsCounter: Counter;
  private readonly activeWorkflowsCounter: UpDownCounter;
  private readonly workflowDurationHistogram: Histogram;
  private readonly ruleMatchesCounter: Counter;
  private readonly eventsIngestedCounter: Counter;
  private readonly eventIngestionErrorsCounter: Counter;
  private readonly eventProcessingDuration: Histogram;
  private readonly investigationsCounter: Counter;
  private readonly investigationFailuresCounter: Counter;
  private readonly investigationToolCallsCounter: Counter;
  private readonly signozQueryFailuresCounter: Counter;
  private readonly telemetryQualityHistogram: Histogram;
  private readonly telemetryMissingSignalsCounter: Counter;

  constructor(private readonly configService: ConfigService) {
    this.serviceName =
      this.configService.get<string>('telemetry.serviceName') ??
      'temporalguard-api';
    this.environment =
      this.configService.get<string>('nodeEnv') ?? 'development';

    this.tracer = trace.getTracer('temporalguard-api');
    this.meter = metrics.getMeter('temporalguard-api');
    this.logger = logs.getLogger('temporalguard-api');

    this.workflowsStartedCounter = this.meter.createCounter(
      METRIC_WORKFLOWS_STARTED_TOTAL,
      {
        description: 'Total number of started workflows',
      },
    );
    this.workflowsCompletedCounter = this.meter.createCounter(
      METRIC_WORKFLOWS_COMPLETED_TOTAL,
      {
        description: 'Total number of completed workflows',
      },
    );
    this.workflowsOverdueCounter = this.meter.createCounter(
      METRIC_WORKFLOWS_OVERDUE_TOTAL,
      {
        description: 'Total number of overdue workflows',
      },
    );
    this.violationsCounter = this.meter.createCounter(METRIC_VIOLATIONS_TOTAL, {
      description: 'Total number of violations created',
    });
    this.activeWorkflowsCounter = this.meter.createUpDownCounter(
      METRIC_ACTIVE_WORKFLOWS,
      {
        description: 'Number of currently active workflows',
      },
    );
    this.workflowDurationHistogram = this.meter.createHistogram(
      METRIC_WORKFLOW_COMPLETION_DURATION,
      {
        description: 'Duration of workflow completion in seconds',
        unit: 's',
      },
    );
    this.ruleMatchesCounter = this.meter.createCounter(
      METRIC_RULE_MATCHES_TOTAL,
      {
        description: 'Total number of rule matches',
      },
    );
    this.eventsIngestedCounter = this.meter.createCounter(
      METRIC_EVENTS_INGESTED_TOTAL,
      { description: 'Total number of accepted business events' },
    );
    this.eventIngestionErrorsCounter = this.meter.createCounter(
      METRIC_EVENT_INGESTION_ERRORS_TOTAL,
      { description: 'Total number of failed business-event ingestion calls' },
    );
    this.eventProcessingDuration = this.meter.createHistogram(
      METRIC_EVENT_PROCESSING_DURATION,
      {
        description: 'End-to-end business-event processing duration',
        unit: 's',
      },
    );
    this.investigationsCounter = this.meter.createCounter(
      METRIC_INVESTIGATIONS_TOTAL,
    );
    this.investigationFailuresCounter = this.meter.createCounter(
      METRIC_INVESTIGATION_FAILURES_TOTAL,
    );
    this.investigationToolCallsCounter = this.meter.createCounter(
      METRIC_INVESTIGATION_TOOL_CALLS_TOTAL,
    );
    this.signozQueryFailuresCounter = this.meter.createCounter(
      METRIC_SIGNOZ_QUERY_FAILURES_TOTAL,
    );
    this.telemetryQualityHistogram = this.meter.createHistogram(
      METRIC_TELEMETRY_QUALITY,
      { unit: '1' },
    );
    this.telemetryMissingSignalsCounter = this.meter.createCounter(
      METRIC_TELEMETRY_MISSING_SIGNALS,
    );
  }

  async trace<T>(
    name: string,
    attributes: Attributes,
    fn: () => Promise<T>,
  ): Promise<T> {
    const span = this.tracer.startSpan(name, {
      attributes: {
        ...attributes,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
      },
    });

    return context.with(trace.setSpan(context.active(), span), async () => {
      try {
        const result = await fn();
        return result;
      } catch (error: unknown) {
        const exception =
          error instanceof Error ? error : new Error('Unknown traced error');
        span.recordException(exception);
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: exception.message,
        });
        throw error;
      } finally {
        span.end();
      }
    });
  }

  workflowStarted(
    workflowId: string,
    ruleId: string,
    ruleName: string,
    status: string,
    businessId?: string,
  ): void {
    const span = this.tracer.startSpan(SPAN_WORKFLOW_CREATED, {
      attributes: {
        [ATTR_WORKFLOW_ID]: workflowId,
        [ATTR_WORKFLOW_STATUS]: status,
        [ATTR_RULE_ID]: ruleId,
        [ATTR_RULE_NAME]: ruleName,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
        ...this.companyAttributes(businessId),
      },
    });
    const attrs = {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
      ...this.companyAttributes(businessId),
    };
    this.workflowsStartedCounter.add(1, attrs);
    this.activeWorkflowsCounter.add(1, attrs);
    this.emitSpanInfo(span, 'Workflow started', {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
      ...this.companyAttributes(businessId),
    });
  }

  workflowCompleted(
    workflowId: string,
    ruleId: string,
    ruleName: string,
    status: string,
    durationMs: number,
    businessId?: string,
  ): void {
    const span = this.tracer.startSpan(SPAN_WORKFLOW_COMPLETED, {
      attributes: {
        [ATTR_WORKFLOW_ID]: workflowId,
        [ATTR_WORKFLOW_STATUS]: status,
        [ATTR_RULE_ID]: ruleId,
        [ATTR_RULE_NAME]: ruleName,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
        ...this.companyAttributes(businessId),
      },
    });
    const attrs = {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
      ...this.companyAttributes(businessId),
    };
    this.workflowsCompletedCounter.add(1, attrs);
    this.activeWorkflowsCounter.add(-1, attrs);
    this.workflowDurationHistogram.record(durationMs / 1000, attrs);
    this.emitSpanInfo(span, 'Workflow completed', {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
      'workflow.duration_ms': durationMs,
      ...this.companyAttributes(businessId),
    });
  }

  workflowExpired(
    workflowId: string,
    ruleId: string,
    ruleName: string,
    status: string,
    businessId?: string,
  ): void {
    const span = this.tracer.startSpan(SPAN_WORKFLOW_OVERDUE, {
      attributes: {
        [ATTR_WORKFLOW_ID]: workflowId,
        [ATTR_WORKFLOW_STATUS]: status,
        [ATTR_RULE_ID]: ruleId,
        [ATTR_RULE_NAME]: ruleName,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
        ...this.companyAttributes(businessId),
      },
    });
    const attrs = {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
      ...this.companyAttributes(businessId),
    };
    this.workflowsOverdueCounter.add(1, attrs);
    this.activeWorkflowsCounter.add(-1, attrs);
    this.emitSpanInfo(span, 'Workflow overdue', {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
      ...this.companyAttributes(businessId),
    });
  }

  violationCreated(
    violationId: string,
    workflowId: string,
    ruleId: string,
    ruleName: string,
    severity: string,
    businessId?: string,
  ): void {
    const span = this.tracer.startSpan(SPAN_VIOLATION_CREATED, {
      attributes: {
        'violation.id': violationId,
        [ATTR_WORKFLOW_ID]: workflowId,
        [ATTR_RULE_ID]: ruleId,
        [ATTR_RULE_NAME]: ruleName,
        [ATTR_SEVERITY]: severity,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
        ...this.companyAttributes(businessId),
      },
    });
    this.violationsCounter.add(1, {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_SEVERITY]: severity,
      ...this.companyAttributes(businessId),
    });
    this.emitSpanInfo(span, 'Violation created', {
      'violation.id': violationId,
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_SEVERITY]: severity,
      ...this.companyAttributes(businessId),
    });
  }

  ruleMatched(
    ruleId: string,
    ruleName: string,
    eventName: string,
    businessId?: string,
  ): void {
    const span = this.tracer.startSpan(SPAN_RULE_MATCHED, {
      attributes: {
        [ATTR_RULE_ID]: ruleId,
        [ATTR_RULE_NAME]: ruleName,
        [ATTR_EVENT_NAME]: eventName,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
        ...this.companyAttributes(businessId),
      },
    });
    this.ruleMatchesCounter.add(1, {
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_EVENT_NAME]: eventName,
      ...this.companyAttributes(businessId),
    });
    this.emitSpanInfo(span, 'Rule matched', {
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_EVENT_NAME]: eventName,
      ...this.companyAttributes(businessId),
    });
  }

  businessEventReceived(
    eventName: string,
    workflowId: string | undefined,
    externalWorkflowId: string | undefined,
    eventLogId: string,
    traceId?: string | null,
    spanId?: string | null,
    businessId?: string,
  ): void {
    const span = this.tracer.startSpan(SPAN_BUSINESS_EVENT_RECEIVED, {
      attributes: {
        [ATTR_EVENT_NAME]: eventName,
        ...(workflowId ? { [ATTR_WORKFLOW_ID]: workflowId } : {}),
        ...(externalWorkflowId
          ? { 'external_workflow.id': externalWorkflowId }
          : {}),
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
        ...this.companyAttributes(businessId),
      },
    });
    this.eventsIngestedCounter.add(1, {
      [ATTR_EVENT_NAME]: eventName,
      ...this.companyAttributes(businessId),
    });
    this.emitSpanInfo(span, 'Business event received', {
      'event_log.id': eventLogId,
      [ATTR_EVENT_NAME]: eventName,
      ...(workflowId ? { [ATTR_WORKFLOW_ID]: workflowId } : {}),
      ...(externalWorkflowId
        ? { 'external_workflow.id': externalWorkflowId }
        : {}),
      ...(traceId ? { trace_id: traceId } : {}),
      ...(spanId ? { span_id: spanId } : {}),
      ...this.companyAttributes(businessId),
    });
  }

  eventIngestionFinished(
    eventName: string,
    durationMs: number,
    succeeded: boolean,
    businessId?: string,
  ): void {
    const attributes = {
      [ATTR_EVENT_NAME]: eventName,
      ...this.companyAttributes(businessId),
    };
    this.eventProcessingDuration.record(durationMs / 1000, attributes);
    if (!succeeded) this.eventIngestionErrorsCounter.add(1, attributes);
  }

  investigationFinished(
    status: string,
    qualityScore: number,
    missingSignals: number,
    businessId?: string,
  ): void {
    const attributes = {
      'temporalguard.investigation.status': status,
      ...this.companyAttributes(businessId),
    };
    this.investigationsCounter.add(1, attributes);
    this.telemetryQualityHistogram.record(qualityScore, attributes);
    if (missingSignals > 0) {
      this.telemetryMissingSignalsCounter.add(missingSignals, attributes);
    }
  }

  investigationToolCall(
    toolName: string,
    status: string,
    businessId?: string,
  ): void {
    this.investigationToolCallsCounter.add(1, {
      'temporalguard.tool.name': toolName,
      'temporalguard.tool.status': status,
      ...this.companyAttributes(businessId),
    });
  }

  investigationFailed(businessId?: string): void {
    this.investigationFailuresCounter.add(
      1,
      this.companyAttributes(businessId),
    );
  }

  signozQueryFailed(signal: string, businessId?: string): void {
    this.signozQueryFailuresCounter.add(1, {
      'temporalguard.signoz.signal': signal,
      ...this.companyAttributes(businessId),
    });
  }

  private emitSpanInfo(
    span: Span,
    body: string,
    attributes: AnyValueMap,
  ): void {
    const spanContext = span.spanContext();
    context.with(trace.setSpan(context.active(), span), () => {
      this.emitInfo(body, {
        ...attributes,
        trace_id: spanContext.traceId,
        span_id: spanContext.spanId,
      });
    });
    span.end();
  }

  private companyAttributes(businessId?: string): Attributes {
    return businessId
      ? {
          [ATTR_COMPANY_ID_HASH]: createHash('sha256')
            .update(businessId)
            .digest('hex'),
        }
      : {};
  }

  private emitInfo(body: string, attributes: AnyValueMap): void {
    this.logger.emit({
      severityNumber: SeverityNumber.INFO,
      severityText: 'INFO',
      body,
      attributes: {
        ...attributes,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
      },
    });
  }
}
