import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import {
  WORKFLOWS_QUEUE,
  TIMEOUT_CHECK_JOB,
} from '../constants/queue.constants';

@Injectable()
export class WorkflowQueueService {
  constructor(
    @InjectQueue(WORKFLOWS_QUEUE)
    private readonly workflowsQueue: Queue,
  ) {}

  async scheduleTimeout(
    workflowId: string,
    ruleId: string,
    deadline: Date,
  ): Promise<void> {
    const delay = Math.max(0, deadline.getTime() - Date.now());
    await this.workflowsQueue.add(
      TIMEOUT_CHECK_JOB,
      { workflowId, ruleId },
      { delay },
    );
  }
}
