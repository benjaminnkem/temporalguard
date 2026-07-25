import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  PROCESSING_DEAD_LETTER_QUEUE,
  PROCESSING_QUEUE,
} from './constants/processing.constants';
import {
  AgentRun,
  AgentToolCall,
  AuditLog,
  DeploymentObservation,
  Evidence,
  Investigation,
  InvestigationStep,
  InvestigationStreamEvent,
  RuleSimulation,
  SigNozConnection,
  SigNozQueryAudit,
  TelemetryQualitySnapshot,
  WorkflowComparison,
} from './entities';
import { AuditService } from './services/audit.service';
import { CompanyConcurrencyService } from './services/company-concurrency.service';
import { EncryptionService } from './services/encryption.service';
import { ProcessingPersistenceService } from './services/processing-persistence.service';
import { ProcessingQueueService } from './services/processing-queue.service';
import { ProcessingRecordsService } from './services/processing-records.service';

export const PROCESSING_ENTITIES = [
  SigNozConnection,
  Investigation,
  InvestigationStep,
  Evidence,
  AgentRun,
  AgentToolCall,
  WorkflowComparison,
  RuleSimulation,
  DeploymentObservation,
  TelemetryQualitySnapshot,
  AuditLog,
  SigNozQueryAudit,
  InvestigationStreamEvent,
];

@Module({
  imports: [
    TypeOrmModule.forFeature(PROCESSING_ENTITIES),
    BullModule.registerQueue(
      { name: PROCESSING_QUEUE },
      { name: PROCESSING_DEAD_LETTER_QUEUE },
    ),
  ],
  providers: [
    EncryptionService,
    AuditService,
    ProcessingPersistenceService,
    ProcessingQueueService,
    CompanyConcurrencyService,
    ProcessingRecordsService,
  ],
  exports: [
    TypeOrmModule,
    EncryptionService,
    AuditService,
    ProcessingPersistenceService,
    ProcessingQueueService,
    CompanyConcurrencyService,
    ProcessingRecordsService,
  ],
})
export class ProcessingModule {}
