import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TelemetryService } from '../services/telemetry.service';
import {
  EVENT_WORKFLOW_CREATED,
  EVENT_WORKFLOW_COMPLETED,
  EVENT_WORKFLOW_OVERDUE,
  EVENT_VIOLATION_CREATED,
  EVENT_RULE_MATCHED,
  EVENT_BUSINESS_EVENT_RECEIVED,
} from '../../../common/constants/event.constants';

@Injectable()
export class TelemetryListener {
  constructor(private readonly telemetryService: TelemetryService) {}

  @OnEvent(EVENT_WORKFLOW_CREATED)
  handleWorkflowCreated(payload: {
    businessId: string;
    workflowId: string;
    ruleId: string;
    ruleName: string;
    status: string;
  }) {
    this.telemetryService.workflowStarted(
      payload.workflowId,
      payload.ruleId,
      payload.ruleName,
      payload.status,
      payload.businessId,
    );
  }

  @OnEvent(EVENT_WORKFLOW_COMPLETED)
  handleWorkflowCompleted(payload: {
    businessId: string;
    workflowId: string;
    ruleId: string;
    ruleName: string;
    status: string;
    durationMs: number;
  }) {
    this.telemetryService.workflowCompleted(
      payload.workflowId,
      payload.ruleId,
      payload.ruleName,
      payload.status,
      payload.durationMs,
      payload.businessId,
    );
  }

  @OnEvent(EVENT_WORKFLOW_OVERDUE)
  handleWorkflowOverdue(payload: {
    businessId: string;
    workflowId: string;
    ruleId: string;
    ruleName: string;
    status: string;
  }) {
    this.telemetryService.workflowExpired(
      payload.workflowId,
      payload.ruleId,
      payload.ruleName,
      payload.status,
      payload.businessId,
    );
  }

  @OnEvent(EVENT_VIOLATION_CREATED)
  handleViolationCreated(payload: {
    businessId: string;
    violationId: string;
    workflowId: string;
    ruleId: string;
    ruleName: string;
    severity: string;
  }) {
    this.telemetryService.violationCreated(
      payload.violationId,
      payload.workflowId,
      payload.ruleId,
      payload.ruleName,
      payload.severity,
      payload.businessId,
    );
  }

  @OnEvent(EVENT_RULE_MATCHED)
  handleRuleMatched(payload: {
    businessId: string;
    ruleId: string;
    ruleName: string;
    eventName: string;
  }) {
    this.telemetryService.ruleMatched(
      payload.ruleId,
      payload.ruleName,
      payload.eventName,
      payload.businessId,
    );
  }

  @OnEvent(EVENT_BUSINESS_EVENT_RECEIVED)
  handleBusinessEventReceived(payload: {
    businessId: string;
    eventName: string;
    workflowId?: string;
    externalWorkflowId?: string;
    eventLogId: string;
    traceId?: string | null;
    spanId?: string | null;
  }) {
    this.telemetryService.businessEventReceived(
      payload.eventName,
      payload.workflowId,
      payload.externalWorkflowId,
      payload.eventLogId,
      payload.traceId,
      payload.spanId,
      payload.businessId,
    );
  }
}
