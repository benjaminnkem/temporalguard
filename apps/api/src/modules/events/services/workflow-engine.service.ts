import { Injectable, Logger } from '@nestjs/common';
import { Rule } from '../../rules/entities';
import { TimeoutUnit } from '../../rules/enums/timeout-unit.enum';
import { RulesService } from '../../rules/services/rules.service';
import { WorkflowStatus } from '../../workflows/enums/workflow-status.enum';
import { WorkflowsService } from '../../workflows/services/workflows.service';
import { Workflow } from '../../workflows/entities';
import { BusinessEvent } from '../entities';

@Injectable()
export class WorkflowEngineService {
  private readonly logger = new Logger(WorkflowEngineService.name);

  constructor(
    private readonly rulesService: RulesService,
    private readonly workflowsService: WorkflowsService,
  ) {}

  async processEvent(event: BusinessEvent): Promise<Workflow[]> {
    const matchingRules = await this.rulesService.findEnabledByTriggerEvent(
      event.eventName,
    );

    if (matchingRules.length === 0) {
      this.logger.debug(
        `No matching rules found for event "${event.eventName}"`,
      );
      return [];
    }

    this.logger.log(
      `Found ${matchingRules.length} matching rule(s) for event "${event.eventName}"`,
    );

    const workflows: Workflow[] = [];

    for (const rule of matchingRules) {
      const workflow = await this.createWorkflowForRule(rule, event);
      workflows.push(workflow);
    }

    return workflows;
  }

  private async createWorkflowForRule(
    rule: Rule,
    event: BusinessEvent,
  ): Promise<Workflow> {
    const deadline = this.calculateDeadline(
      event.timestamp,
      rule.timeoutValue,
      rule.timeoutUnit,
    );

    const workflow = await this.workflowsService.createFromRule({
      ruleId: rule.id,
      externalId: event.externalWorkflowId,
      name: rule.name,
      status: WorkflowStatus.WAITING,
      deadline,
      currentState: {
        receivedEvents: [],
        expectedEvents: rule.expectedEvents,
        operator: rule.operator,
      },
    });

    this.logger.log(
      `Created workflow "${workflow.id}" for rule "${rule.name}" with deadline ${deadline.toISOString()}`,
    );

    return workflow;
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
