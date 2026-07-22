import { Injectable } from '@nestjs/common';
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
} from '@opentelemetry/api';
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
  private readonly serviceName =
    process.env.OTEL_SERVICE_NAME || 'temporalguard-api';
  private readonly environment = process.env.NODE_ENV || 'development';

  private readonly workflowsStartedCounter: Counter;
  private readonly workflowsCompletedCounter: Counter;
  private readonly workflowsOverdueCounter: Counter;
  private readonly violationsCounter: Counter;
  private readonly activeWorkflowsCounter: UpDownCounter;
  private readonly workflowDurationHistogram: Histogram;
  private readonly ruleMatchesCounter: Counter;

  constructor() {
    this.tracer = trace.getTracer('temporalguard-api');
    this.meter = metrics.getMeter('temporalguard-api');

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
    this.ruleMatchesCounter = this.meter.createCounter(METRIC_RULE_MATCHES_TOTAL, {
      description: 'Total number of rule matches',
    });
  }

  async trace<T>(
    name: string,
    attributes: Record<string, any>,
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
      } catch (error) {
        span.recordException(error);
        span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
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
    span.end();

    const attrs = { [ATTR_RULE_NAME]: ruleName, [ATTR_WORKFLOW_STATUS]: status };
    this.workflowsStartedCounter.add(1, attrs);
    this.activeWorkflowsCounter.add(1, attrs);
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
    span.end();

    const attrs = { [ATTR_RULE_NAME]: ruleName, [ATTR_WORKFLOW_STATUS]: status };
    this.workflowsCompletedCounter.add(1, attrs);
    this.activeWorkflowsCounter.add(-1, attrs);
    this.workflowDurationHistogram.record(durationMs / 1000, attrs);
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
    span.end();

    const attrs = { [ATTR_RULE_NAME]: ruleName, [ATTR_WORKFLOW_STATUS]: status };
    this.workflowsOverdueCounter.add(1, attrs);
    this.activeWorkflowsCounter.add(-1, attrs);
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
    span.end();

    this.violationsCounter.add(1, { [ATTR_RULE_NAME]: ruleName, [ATTR_SEVERITY]: severity });
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
    span.end();

    this.ruleMatchesCounter.add(1, {
      [ATTR_RULE_NAME]: ruleName,
      [ATTR_EVENT_NAME]: eventName,
    });
  }

  businessEventReceived(eventName: string, workflowId: string): void {
    const span = this.tracer.startSpan(SPAN_BUSINESS_EVENT_RECEIVED, {
      attributes: {
        [ATTR_EVENT_NAME]: eventName,
        [ATTR_WORKFLOW_ID]: workflowId,
        [ATTR_SERVICE_NAME]: this.serviceName,
        [ATTR_ENVIRONMENT]: this.environment,
      },
    });
    span.end();
  }
}
