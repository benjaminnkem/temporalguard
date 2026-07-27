import { ConfigService } from '@nestjs/config';
import type { Queue } from 'bullmq';
import type { ProcessingPersistenceService } from './processing-persistence.service';
import {
  ProcessingQueueService,
  stableJobId,
} from './processing-queue.service';

describe('ProcessingQueueService', () => {
  it('creates deterministic BullMQ-safe job IDs', () => {
    const first = stableJobId('investigation', 'violation:1:config');
    expect(first).toBe(stableJobId('investigation', 'violation:1:config'));
    expect(first).not.toContain(':');
    expect(first).not.toBe(stableJobId('comparison', 'violation:1:config'));
  });

  it('reconciles an existing job after restart without adding a duplicate', async () => {
    const add = jest.fn();
    const markQueued = jest.fn().mockResolvedValue(undefined);
    const queue = {
      getJob: jest.fn().mockResolvedValue({ id: 'existing' }),
      add,
    } as unknown as Queue;
    const deadLetterQueue = { add: jest.fn() } as unknown as Queue;
    const persistence = {
      markQueued,
    } as unknown as ProcessingPersistenceService;
    const service = new ProcessingQueueService(
      queue,
      deadLetterQueue,
      new ConfigService({ queue: { retryAttempts: 3 } }),
      persistence,
    );
    await service.enqueue('investigation', {
      businessId: 'business',
      entityId: 'investigation',
      requestedBy: 'user',
      correlationId: 'request',
      idempotencyKey: 'stable-key',
    });

    expect(add).not.toHaveBeenCalled();
    expect(markQueued).toHaveBeenCalledWith('business', 'investigation');
  });
});
