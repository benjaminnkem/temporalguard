import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_RULE_MATCHED } from '../../../common/constants/event.constants';
import { Rule } from '../../rules/entities';
import { RuleOperator } from '../../rules/enums/rule-operator.enum';
import { TimeoutUnit } from '../../rules/enums/timeout-unit.enum';
import { RulesService } from '../../rules/services/rules.service';
import { Workflow } from '../../workflows/entities';
import { WorkflowStatus } from '../../workflows/enums/workflow-status.enum';
import { WorkflowsService } from '../../workflows/services/workflows.service';
import { EventLog } from '../entities';
import { ViolationsService } from '../../violations/services/violations.service';
import { ViolationSeverity } from '../../violations/enums/violation-severity.enum';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly rulesService: RulesService,
    private readonly workflowsService: WorkflowsService,
    private readonly violationsService: ViolationsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async processEvent(log: EventLog): Promise<Workflow[]> {
    if (!log.externalWorkflowRecordId || !log.externalWorkflow) return [];

    const affected = new Map<string, Workflow>();
    const triggerRules = await this.rulesService.findEnabledByTriggerEvent(
      log.businessId,
      log.eventId,
    );

    for (const rule of triggerRules) {
      this.eventEmitter.emit(EVENT_RULE_MATCHED, {
        businessId: log.businessId,
        ruleId: rule.id,
        ruleName: rule.name,
        eventName: log.event.name,
      });

      let workflow =
        await this.workflowsService.findWaitingForRuleAndExternalWorkflow(
          rule.id,
          log.externalWorkflowRecordId,
        );
      if (!workflow) {
        try {
          workflow = await this.createWorkflowForRule(rule, log);
        } catch (error) {
          if ((error as { code?: string }).code !== '23505') throw error;
          workflow =
            await this.workflowsService.findWaitingForRuleAndExternalWorkflow(
              rule.id,
              log.externalWorkflowRecordId,
            );
          if (!workflow) throw error;
        }
      }
      affected.set(workflow.id, workflow);
    }

    const expectingRules = await this.rulesService.findEnabledExpectingEvent(
      log.businessId,
      log.eventId,
    );
    const waiting =
      await this.workflowsService.findWaitingByExternalWorkflowAndRules(
        log.externalWorkflowRecordId,
        expectingRules.map((rule) => rule.id),
      );

    for (const workflow of waiting) {
      const expectedNames = workflow.rule.expectedEventDefinitions.map(
        (event) => event.name,
      );
      const state = workflow.currentState ?? {};
      const received = new Set(
        Array.isArray(state.receivedEvents)
          ? (state.receivedEvents as string[])
          : [],
      );
      received.add(log.event.name);
      const receivedEvents = [...received];
      const forbiddenObserved =
        workflow.rule.operator === RuleOperator.FORBID &&
        expectedNames.some((name) => received.has(name));
      const completed =
        !forbiddenObserved &&
        (workflow.rule.operator === RuleOperator.ANY
          ? receivedEvents.some((name) => expectedNames.includes(name))
          : workflow.rule.operator !== RuleOperator.FORBID &&
            expectedNames.every((name) => received.has(name)));

      let saved = await this.workflowsService.saveState(
        workflow,
        {
          ...state,
          receivedEvents,
          expectedEvents: expectedNames,
          operator: workflow.rule.operator,
        },
        completed,
      );

      if (forbiddenObserved) {
        saved = await this.workflowsService.updateStatus(
          workflow.businessId,
          workflow.id,
          WorkflowStatus.OVERDUE,
        );
        await this.violationsService.create({
          businessId: workflow.businessId,
          workflowId: workflow.id,
          ruleId: workflow.rule.id,
          severity: workflow.rule.severity as unknown as ViolationSeverity,
          reason: `Forbidden event observed during the rule window: ${log.event.name}`,
          occurredAt: new Date(),
          details: {
            type: 'forbidden_event_observed',
            eventName: log.event.name,
            eventLogId: log.id,
          },
        });
      }
      affected.set(saved.id, saved);
    }

    return [...affected.values()];
  }

  private async createWorkflowForRule(
    rule: Rule,
    log: EventLog,
  ): Promise<Workflow> {
    // Live enforcement starts when TemporalGuard receives the trigger. Using
    // the producer timestamp here made delayed or replayed events create a
    // deadline in the past and immediately enqueue an overdue transition.
    // The producer timestamp remains persisted as the event occurrence time
    // and is available for evidence and historical simulation.
    const receivedAt =
      log.createdAt instanceof Date ? log.createdAt : new Date();
    const deadline = this.calculateDeadline(
      receivedAt,
      rule.timeoutValue,
      rule.timeoutUnit,
    );
    return this.workflowsService.createFromRule({
      businessId: log.businessId,
      ruleId: rule.id,
      rule,
      externalId: log.externalWorkflow!.externalId,
      externalWorkflowId: log.externalWorkflowRecordId,
      externalWorkflow: log.externalWorkflow!,
      name: rule.name,
      status: WorkflowStatus.WAITING,
      deadline,
      currentState: {
        receivedEvents: [],
        expectedEvents: rule.expectedEventDefinitions.map(
          (event) => event.name,
        ),
        operator: rule.operator,
        triggerOccurredAt: log.timestamp.toISOString(),
        triggerReceivedAt: receivedAt.toISOString(),
      },
    });
  }

  calculateDeadline(
    from: Date,
    timeoutValue: number,
    timeoutUnit: TimeoutUnit,
  ): Date {
    const deadline = new Date(from);
    switch (timeoutUnit) {
      case TimeoutUnit.SECONDS:
        deadline.setSeconds(deadline.getSeconds() + timeoutValue);
        break;
      case TimeoutUnit.MINUTES:
        deadline.setMinutes(deadline.getMinutes() + timeoutValue);
        break;
      case TimeoutUnit.HOURS:
        deadline.setHours(deadline.getHours() + timeoutValue);
        break;
      case TimeoutUnit.DAYS:
        deadline.setDate(deadline.getDate() + timeoutValue);
        break;
    }
    return deadline;
  }
}
