import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import {
  Investigation,
  ProcessingStatus,
  SigNozConnection,
  SigNozMode,
} from '../entities';
import { AuditService } from './audit.service';
import { EncryptionService } from './encryption.service';

export interface CreateInvestigationInput {
  businessId: string;
  violationId: string;
  workflowId: string;
  ruleId: string;
  trigger: string;
  configurationHash: string;
  requestedBy: string;
}

@Injectable()
export class ProcessingPersistenceService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Investigation)
    private readonly investigations: Repository<Investigation>,
    @InjectRepository(SigNozConnection)
    private readonly connections: Repository<SigNozConnection>,
    private readonly audit: AuditService,
    private readonly encryption: EncryptionService,
  ) {}

  createInvestigation(input: CreateInvestigationInput): Promise<Investigation> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Investigation);
      const existing = await repository.findOneBy({
        businessId: input.businessId,
        violationId: input.violationId,
        configurationHash: input.configurationHash,
      });
      if (existing) return existing;
      const investigation = await repository.save(
        repository.create({ ...input, status: ProcessingStatus.PENDING }),
      );
      await this.audit.record(
        {
          businessId: input.businessId,
          actorId: input.requestedBy,
          action: 'investigation.created',
          entityType: 'investigation',
          entityId: investigation.id,
          metadata: { configurationHash: input.configurationHash },
        },
        manager,
      );
      return investigation;
    });
  }

  async markQueued(businessId: string, investigationId: string): Promise<void> {
    const result = await this.investigations.update(
      {
        id: investigationId,
        businessId,
        status: ProcessingStatus.PENDING,
      },
      { status: ProcessingStatus.QUEUED },
    );
    if (!result.affected) {
      const existing = await this.investigations.findOneBy({
        id: investigationId,
        businessId,
      });
      if (!existing) throw new NotFoundException('Investigation not found');
      if (
        ![ProcessingStatus.QUEUED, ProcessingStatus.RUNNING].includes(
          existing.status,
        )
      ) {
        throw new ConflictException({
          code: 'INVESTIGATION_NOT_QUEUEABLE',
          message: `Investigation cannot be queued from ${existing.status}`,
        });
      }
    }
  }

  requestCancellation(
    businessId: string,
    investigationId: string,
    actorId: string,
  ): Promise<void> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Investigation);
      const result = await repository.update(
        {
          id: investigationId,
          businessId,
          status: ProcessingStatus.QUEUED,
        },
        { cancellationRequestedAt: new Date() },
      );
      if (!result.affected) {
        await repository.update(
          {
            id: investigationId,
            businessId,
            status: ProcessingStatus.RUNNING,
          },
          { cancellationRequestedAt: new Date() },
        );
      }
      await this.audit.record(
        {
          businessId,
          actorId,
          action: 'investigation.cancellation_requested',
          entityType: 'investigation',
          entityId: investigationId,
        },
        manager,
      );
    });
  }

  async upsertConnection(input: {
    businessId: string;
    createdBy: string;
    name: string;
    mode: SigNozMode;
    apiUrl: string;
    uiUrl: string;
    apiKey: string;
    ingestionEndpoint?: string | null;
  }): Promise<SigNozConnection> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(SigNozConnection);
      const existing = await repository.findOneBy({
        businessId: input.businessId,
        name: input.name,
      });
      const connection = await repository.save(
        repository.create({
          ...existing,
          ...input,
          ingestionEndpoint: input.ingestionEndpoint ?? null,
          encryptedApiKey: this.encryption.encrypt(input.apiKey),
        }),
      );
      await this.audit.record(
        {
          businessId: input.businessId,
          actorId: input.createdBy,
          action: existing
            ? 'signoz_connection.updated'
            : 'signoz_connection.created',
          entityType: 'signoz_connection',
          entityId: connection.id,
          metadata: { mode: input.mode, name: input.name },
        },
        manager,
      );
      return connection;
    });
  }

  async getConnectionSecret(
    businessId: string,
    connectionId: string,
  ): Promise<string> {
    const connection = await this.connections
      .createQueryBuilder('connection')
      .addSelect('connection.encryptedApiKey')
      .where('connection.id = :connectionId', { connectionId })
      .andWhere('connection.businessId = :businessId', { businessId })
      .getOne();
    if (!connection) throw new NotFoundException('SigNoz connection not found');
    return this.encryption.decrypt(connection.encryptedApiKey);
  }
}
