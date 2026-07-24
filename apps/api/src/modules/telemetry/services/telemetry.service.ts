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
  ): void {
    const span = this.tracer.startSpan(SPAN_WORKFLOW_CREATED, {
      attributes: {
        [ATTR_WORKFLOW_ID]: workflowId,
        [ATTR_WORKFLOW_STATUS]: status,
        [ATTR_RULE_ID]: ruleId,
        [ATTR_RULE_NAME]: ruleName,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
      },
    });
    const attrs = {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
    };
    this.workflowsStartedCounter.add(1, attrs);
    this.activeWorkflowsCounter.add(1, attrs);
    this.emitSpanInfo(span, 'Workflow started', {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
    });
  }

  workflowCompleted(
    workflowId: string,
    ruleId: string,
    ruleName: string,
    status: string,
    durationMs: number,
  ): void {
    const span = this.tracer.startSpan(SPAN_WORKFLOW_COMPLETED, {
      attributes: {
        [ATTR_WORKFLOW_ID]: workflowId,
        [ATTR_WORKFLOW_STATUS]: status,
        [ATTR_RULE_ID]: ruleId,
        [ATTR_RULE_NAME]: ruleName,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
      },
    });
    const attrs = {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
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
    });
  }

  workflowExpired(
    workflowId: string,
    ruleId: string,
    ruleName: string,
    status: string,
  ): void {
    const span = this.tracer.startSpan(SPAN_WORKFLOW_OVERDUE, {
      attributes: {
        [ATTR_WORKFLOW_ID]: workflowId,
        [ATTR_WORKFLOW_STATUS]: status,
        [ATTR_RULE_ID]: ruleId,
        [ATTR_RULE_NAME]: ruleName,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
      },
    });
    const attrs = {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
    };
    this.workflowsOverdueCounter.add(1, attrs);
    this.activeWorkflowsCounter.add(-1, attrs);
    this.emitSpanInfo(span, 'Workflow overdue', {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_WORKFLOW_STATUS]: status,
    });
  }

  violationCreated(
    violationId: string,
    workflowId: string,
    ruleId: string,
    ruleName: string,
    severity: string,
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
      },
    });
    this.violationsCounter.add(1, {
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_SEVERITY]: severity,
    });
    this.emitSpanInfo(span, 'Violation created', {
      'violation.id': violationId,
      [ATTR_WORKFLOW_ID]: workflowId,
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_SEVERITY]: severity,
    });
  }

  ruleMatched(ruleId: string, ruleName: string, eventName: string): void {
    const span = this.tracer.startSpan(SPAN_RULE_MATCHED, {
      attributes: {
        [ATTR_RULE_ID]: ruleId,
        [ATTR_RULE_NAME]: ruleName,
        [ATTR_EVENT_NAME]: eventName,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
      },
    });
    this.ruleMatchesCounter.add(1, {
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_EVENT_NAME]: eventName,
    });
    this.emitSpanInfo(span, 'Rule matched', {
      [ATTR_RULE_ID]: ruleId,
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_EVENT_NAME]: eventName,
    });
  }

  businessEventReceived(
    eventName: string,
    workflowId: string | undefined,
    externalWorkflowId: string | undefined,
    eventLogId: string,
    traceId?: string | null,
    spanId?: string | null,
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
      },
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
