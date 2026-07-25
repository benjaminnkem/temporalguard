import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Job, UnrecoverableError } from 'bullmq';
import { DataSource, EntityManager } from 'typeorm';
import { createHash } from 'node:crypto';
import {
  PROCESSING_QUEUE,
  type ProcessingJobName,
} from '../constants/processing.constants';
import {
  Investigation,
  InvestigationStep,
  ProcessingStatus,
  RuleSimulation,
  TelemetryQualitySnapshot,
  WorkflowComparison,
} from '../entities';
import { AuditService } from './audit.service';
import { InvestigationEngine } from '../../investigations/investigation-engine.service';
import { TelemetryService } from '../../telemetry/services/telemetry.service';
import { CompanyConcurrencyService } from './company-concurrency.service';
import {
  type ProcessingJobData,
  ProcessingQueueService,
} from './processing-queue.service';

@Processor(PROCESSING_QUEUE, { concurrency: 4 })
@Injectable()
export class ProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(ProcessingProcessor.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly concurrency: CompanyConcurrencyService,
    private readonly queue: ProcessingQueueService,
    private readonly audit: AuditService,
    private readonly investigationEngine: InvestigationEngine,
    private readonly telemetry: TelemetryService,
    config: ConfigService,
  ) {
    super();
    void config;
  }

  async process(job: Job<ProcessingJobData>): Promise<void> {
    return this.telemetry.trace(
      'temporalguard.queue.process',
      {
        'messaging.system': 'bullmq',
        'messaging.destination.name': PROCESSING_QUEUE,
        'temporalguard.queue.job_name': job.name,
        'temporalguard.company.id_hash': createHash('sha256')
          .update(job.data.businessId)
          .digest('hex'),
      },
      () => this.processJob(job),
    );
  }

  private async processJob(job: Job<ProcessingJobData>): Promise<void> {
    const jobId = String(job.id);
    const acquired = await this.concurrency.acquire(job.data.businessId, jobId);
    if (!acquired) throw new Error('COMPANY_CONCURRENCY_LIMIT');

    try {
      await job.updateProgress({ phase: 'starting', percent: 5 });
      await this.dataSource.transaction(async (manager) => {
        await this.start(manager, job.name as ProcessingJobName, job.data);
        await this.audit.record(
          {
            businessId: job.data.businessId,
            actorId: job.data.requestedBy,
            action: `${job.name}.started`,
            entityType: job.name,
            entityId: job.data.entityId,
            metadata: {
              jobId,
              correlationId: job.data.correlationId,
              attempt: job.attemptsMade + 1,
            },
          },
          manager,
        );
      });

      await job.updateProgress({ phase: 'processing', percent: 50 });
      await this.ensureNotCancelled(job.name as ProcessingJobName, job.data);
      if (job.name === 'investigation') {
        const controller = new AbortController();
        const cancellationPoll = setInterval(() => {
          void this.dataSource
            .getRepository(Investigation)
            .findOneBy({
              id: job.data.entityId,
              businessId: job.data.businessId,
            })
            .then((row) => {
              if (row?.cancellationRequestedAt) controller.abort();
            });
        }, 500);
        try {
          await this.investigationEngine.execute(
            job.data.businessId,
            job.data.entityId,
            controller.signal,
          );
        } finally {
          clearInterval(cancellationPoll);
        }
        await job.updateProgress({ phase: 'completed', percent: 100 });
        return;
      }

      await this.dataSource.transaction(async (manager) => {
        await this.complete(manager, job.name as ProcessingJobName, job.data);
        await this.audit.record(
          {
            businessId: job.data.businessId,
            actorId: job.data.requestedBy,
            action: `${job.name}.completed`,
            entityType: job.name,
            entityId: job.data.entityId,
            metadata: { jobId, correlationId: job.data.correlationId },
          },
          manager,
        );
      });
      await job.updateProgress({ phase: 'completed', percent: 100 });
    } finally {
      await this.concurrency.release(job.data.businessId, jobId);
    }
  }

  private async start(
    manager: EntityManager,
    name: ProcessingJobName,
    data: ProcessingJobData,
  ): Promise<void> {
    const values = { status: ProcessingStatus.RUNNING, startedAt: new Date() };
    if (name === 'investigation') {
      await manager
        .getRepository(Investigation)
        .update({ id: data.entityId, businessId: data.businessId }, values);
      const repository = manager.getRepository(InvestigationStep);
      await repository.upsert(
        {
          investigationId: data.entityId,
          sequence: 0,
          type: 'worker',
          name: 'Durable processing',
          status: ProcessingStatus.RUNNING,
          startedAt: new Date(),
        },
        ['investigationId', 'sequence'],
      );
      return;
    }
    const repository =
      name === 'comparison'
        ? manager.getRepository(WorkflowComparison)
        : name === 'simulation'
          ? manager.getRepository(RuleSimulation)
          : undefined;
    if (repository) {
      await repository.update(
        { id: data.entityId, businessId: data.businessId },
        values,
      );
    }
  }

  private async ensureNotCancelled(
    name: ProcessingJobName,
    data: ProcessingJobData,
  ): Promise<void> {
    if (name !== 'investigation') return;
    const investigation = await this.dataSource
      .getRepository(Investigation)
      .findOneByOrFail({ id: data.entityId, businessId: data.businessId });
    if (investigation.cancellationRequestedAt) {
      await this.dataSource.getRepository(Investigation).update(
        { id: data.entityId, businessId: data.businessId },
        {
          status: ProcessingStatus.CANCELLED,
          cancelledAt: new Date(),
          completedAt: new Date(),
        },
      );
      throw new UnrecoverableError('JOB_CANCELLED');
    }
  }

  private async complete(
    manager: EntityManager,
    name: ProcessingJobName,
    data: ProcessingJobData,
  ): Promise<void> {
    const values = {
      status: ProcessingStatus.COMPLETED,
      completedAt: new Date(),
    };
    if (name === 'investigation') {
      await manager
        .getRepository(Investigation)
        .update({ id: data.entityId, businessId: data.businessId }, values);
      await manager
        .getRepository(InvestigationStep)
        .update(
          { investigationId: data.entityId, sequence: 0 },
          { ...values, outputSummary: { durableProcessing: true } },
        );
      return;
    }
    if (name === 'comparison') {
      await manager
        .getRepository(WorkflowComparison)
        .update({ id: data.entityId, businessId: data.businessId }, values);
    } else if (name === 'simulation') {
      await manager
        .getRepository(RuleSimulation)
        .update({ id: data.entityId, businessId: data.businessId }, values);
    } else if (name === 'telemetry-quality') {
      await manager.getRepository(TelemetryQualitySnapshot).findOneBy({
        id: data.entityId,
        businessId: data.businessId,
      });
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(
    job: Job<ProcessingJobData> | undefined,
    error: Error,
  ): Promise<void> {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) return;
    const name = job.name as ProcessingJobName;
    await this.queue.deadLetter(name, job.data, String(job.id), error.message);
    if (name === 'investigation') {
      await this.dataSource.getRepository(Investigation).update(
        { id: job.data.entityId, businessId: job.data.businessId },
        {
          status:
            error.message === 'JOB_CANCELLED'
              ? ProcessingStatus.CANCELLED
              : ProcessingStatus.DEAD_LETTER,
          errorCode: error.message,
          completedAt: new Date(),
        },
      );
    }
    this.logger.error(`Job ${String(job.id)} moved to dead letter`);
  }
}
