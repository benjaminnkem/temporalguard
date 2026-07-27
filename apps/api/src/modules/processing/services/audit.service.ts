import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';
import { AuditLog } from '../entities';

export interface AuditInput {
  businessId: string;
  actorId?: string | null;
  action: string;
  entityType: string;
  entityId?: string | null;
  metadata?: Record<string, unknown> | null;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly repository: Repository<AuditLog>,
  ) {}

  record(input: AuditInput, manager?: EntityManager): Promise<AuditLog> {
    const repository = manager
      ? manager.getRepository(AuditLog)
      : this.repository;
    return repository.save(repository.create(input));
  }
}
