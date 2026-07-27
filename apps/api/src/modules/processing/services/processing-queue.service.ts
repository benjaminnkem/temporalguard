import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import {
  PROCESSING_DEAD_LETTER_QUEUE,
  PROCESSING_QUEUE,
  type ProcessingJobName,
} from '../constants/processing.constants';
import { ProcessingPersistenceService } from './processing-persistence.service';

export interface ProcessingJobData {
  businessId: string;
  entityId: string;
  requestedBy: string;
  correlationId: string;
  idempotencyKey: string;
}

export function stableJobId(
  name: ProcessingJobName,
  idempotencyKey: string,
): string {
  const digest = createHash('sha256')
    .update(`${name}\0${idempotencyKey}`)
    .digest('hex');
  return `${name}-${digest}`;
}

@Injectable()
export class ProcessingQueueService {
  private readonly attempts: number;

  constructor(
    @InjectQueue(PROCESSING_QUEUE) private readonly queue: Queue,
    @InjectQueue(PROCESSING_DEAD_LETTER_QUEUE)
    private readonly deadLetterQueue: Queue,
    private readonly config: ConfigService,
    private readonly persistence: ProcessingPersistenceService,
  ) {
    this.attempts = config.get<number>('queue.retryAttempts') ?? 5;
  }

  async enqueue(
    name: ProcessingJobName,
    data: ProcessingJobData,
  ): Promise<string> {
    const jobId = stableJobId(name, data.idempotencyKey);
    const existing = await this.queue.getJob(jobId);
    if (!existing) {
      await this.queue.add(name, data, {
        jobId,
        attempts: this.attempts,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: { age: 86_400, count: 10_000 },
        removeOnFail: false,
      });
    }
    if (name === 'investigation') {
      await this.persistence.markQueued(data.businessId, data.entityId);
    }
    return jobId;
  }

  async cancel(jobId: string): Promise<boolean> {
    const job = await this.queue.getJob(jobId);
    if (!job) return false;
    const state = await job.getState();
    if (state === 'waiting' || state === 'delayed') {
      await job.remove();
      return true;
    }
    return false;
  }

  async deadLetter(
    name: ProcessingJobName,
    data: ProcessingJobData,
    sourceJobId: string,
    reason: string,
  ): Promise<void> {
    await this.deadLetterQueue.add(
      name,
      { ...data, sourceJobId, reason, failedAt: new Date().toISOString() },
      {
        jobId: `dead-${sourceJobId}`,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  }
}
