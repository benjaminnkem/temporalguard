import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { WorkflowsService } from './workflows.service';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { ViolationsService } from '../../violations/services/violations.service';
import { ViolationSeverity } from '../../violations/enums/violation-severity.enum';

import { WORKFLOWS_QUEUE } from '../constants/queue.constants';

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
    job: Job<{ workflowId: string; ruleId: string }>,
  ): Promise<void> {
    const { workflowId } = job.data;

    try {
      const workflow = await this.workflowsService.findOne(workflowId);

      if (workflow.status === WorkflowStatus.WAITING) {
        await this.workflowsService.updateStatus(
          workflowId,
          WorkflowStatus.OVERDUE,
        );
        this.logger.log(`Workflow ${workflowId} marked as OVERDUE`);

        const expectedEventsList = workflow.currentState && Array.isArray(workflow.currentState.expectedEvents)
          ? (workflow.currentState.expectedEvents as string[])
          : [];

        await this.violationsService.create({
          workflowId: workflow.id,
          ruleId: workflow.rule.id,
          severity: workflow.rule.severity as unknown as ViolationSeverity,
          reason: `Workflow timed out waiting for expected events: ${expectedEventsList.join(', ')}`,
          occurredAt: new Date(),
        });
        this.logger.log(`Violation created for overdue workflow ${workflowId}`);
      }
    } catch (error) {
      this.logger.error(
        `Failed to process timeout check for workflow ${workflowId}: ${error.message}`,
      );
      throw error;
    }
  }
}
