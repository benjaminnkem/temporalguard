import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { Repository } from 'typeorm';
import { Violation } from '../violations/entities';
import {
  Evidence,
  Investigation,
  ProcessingStatus,
} from '../processing/entities';
import { ProcessingPersistenceService } from '../processing/services/processing-persistence.service';
import {
  ProcessingQueueService,
  stableJobId,
} from '../processing/services/processing-queue.service';
import { InvestigationStreamService } from './investigation-stream.service';

@Injectable()
export class InvestigationsService {
  constructor(
    @InjectRepository(Investigation)
    private readonly investigations: Repository<Investigation>,
    @InjectRepository(Evidence)
    private readonly evidence: Repository<Evidence>,
    @InjectRepository(Violation)
    private readonly violations: Repository<Violation>,
    private readonly persistence: ProcessingPersistenceService,
    private readonly queue: ProcessingQueueService,
    private readonly stream: InvestigationStreamService,
  ) {}

  async start(
    businessId: string,
    requestedBy: string,
    violationId: string,
    idempotencyKey?: string,
  ): Promise<Investigation> {
    const violation = await this.violations.findOneBy({
      id: violationId,
      businessId,
    });
    if (!violation) throw new NotFoundException('Violation not found');
    const configurationHash = createHash('sha256')
      .update(
        JSON.stringify({
          violationId,
          workflowId: violation.workflowId,
          ruleId: violation.ruleId,
          policy: 'investigation-v1',
          key: idempotencyKey ?? 'default',
        }),
      )
      .digest('hex');
    const investigation = await this.persistence.createInvestigation({
      businessId,
      violationId,
      workflowId: violation.workflowId,
      ruleId: violation.ruleId,
      trigger: 'user',
      configurationHash,
      requestedBy,
    });
    if (investigation.status === ProcessingStatus.PENDING) {
      await this.stream.append(businessId, investigation.id, 'queued', {
        status: ProcessingStatus.QUEUED,
      });
      await this.queue.enqueue('investigation', {
        businessId,
        entityId: investigation.id,
        requestedBy,
        correlationId: investigation.id,
        idempotencyKey: investigation.id,
      });
    }
    return this.get(businessId, investigation.id);
  }

  async get(businessId: string, id: string): Promise<Investigation> {
    const investigation = await this.investigations.findOne({
      where: { id, businessId },
      relations: { steps: true, evidence: true },
      order: { steps: { sequence: 'ASC' }, evidence: { createdAt: 'ASC' } },
    });
    if (!investigation) throw new NotFoundException('Investigation not found');
    return investigation;
  }

  list(businessId: string): Promise<Investigation[]> {
    return this.investigations.find({
      where: { businessId },
      order: { createdAt: 'DESC', id: 'DESC' },
      take: 100,
    });
  }

  async cancel(
    businessId: string,
    id: string,
    requestedBy: string,
  ): Promise<Investigation> {
    const investigation = await this.get(businessId, id);
    if (
      [
        ProcessingStatus.COMPLETED,
        ProcessingStatus.COMPLETED_WITH_GAPS,
        ProcessingStatus.CANCELLED,
        ProcessingStatus.DEAD_LETTER,
      ].includes(investigation.status)
    ) {
      throw new ConflictException('Investigation is already terminal');
    }
    await this.persistence.requestCancellation(businessId, id, requestedBy);
    const removed = await this.queue.cancel(stableJobId('investigation', id));
    if (removed) {
      await this.investigations.update(
        { id, businessId },
        {
          status: ProcessingStatus.CANCELLED,
          cancelledAt: new Date(),
          completedAt: new Date(),
        },
      );
    }
    await this.stream.append(businessId, id, 'cancellation_requested', {
      removedFromQueue: removed,
    });
    return this.get(businessId, id);
  }

  async rerun(
    businessId: string,
    id: string,
    requestedBy: string,
  ): Promise<Investigation> {
    const source = await this.get(businessId, id);
    return this.start(
      businessId,
      requestedBy,
      source.violationId,
      `rerun:${id}:${Date.now()}`,
    );
  }

  async export(businessId: string, id: string) {
    const investigation = await this.get(businessId, id);
    const evidence = await this.evidence.find({
      where: { businessId, investigationId: id },
      order: { createdAt: 'ASC' },
    });
    return {
      schemaVersion: '1.0',
      exportedAt: new Date().toISOString(),
      investigation,
      evidence,
    };
  }
}
