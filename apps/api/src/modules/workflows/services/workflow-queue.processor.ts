import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { ViolationsService } from '../../violations/services/violations.service';
import { ViolationSeverity } from '../../violations/enums/violation-severity.enum';

import { WORKFLOWS_QUEUE } from '../constants/queue.constants';
import { RuleOperator } from '../../rules/enums/rule-operator.enum';

@Processor(WORKFLOWS_QUEUE)
@Injectable()
export class WorkflowQueueProcessor extends WorkerHost {
  private readonly logger = new Logger(WorkflowQueueProcessor.name);

  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly violationsService: ViolationsService,
  ) {
    super();
  }

  async process(
    job: Job<{ businessId: string; workflowId: string; ruleId: string }>,
  ): Promise<void> {
    const { businessId, workflowId } = job.data;

    try {
      const workflow = await this.workflowsService.findOne(
        businessId,
        workflowId,
      );

      if (workflow.status === WorkflowStatus.WAITING) {
        if (workflow.rule.operator === RuleOperator.FORBID) {
          await this.workflowsService.updateStatus(
            businessId,
            workflowId,
            WorkflowStatus.COMPLETED,
          );
          this.logger.log(
            `Forbidden-event observation window completed for workflow ${workflowId}`,
          );
          return;
        }

        await this.workflowsService.updateStatus(
          businessId,
          workflowId,
          WorkflowStatus.OVERDUE,
        );
        this.logger.log(`Workflow ${workflowId} marked as OVERDUE`);

        const expectedEventsList =
          workflow.currentState &&
          Array.isArray(workflow.currentState.expectedEvents)
            ? (workflow.currentState.expectedEvents as string[])
            : [];

        await this.violationsService.create({
          businessId,
          workflowId: workflow.id,
          ruleId: workflow.rule.id,
          severity: workflow.rule.severity as unknown as ViolationSeverity,
          reason: `Workflow timed out waiting for expected events: ${expectedEventsList.join(', ')}`,
          occurredAt: new Date(),
        });
        this.logger.log(`Violation created for overdue workflow ${workflowId}`);
      }
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Unknown timeout job error';
      this.logger.error(
        `Failed to process timeout check for workflow ${workflowId}: ${message}`,
      );
      throw error;
    }
  }
}
