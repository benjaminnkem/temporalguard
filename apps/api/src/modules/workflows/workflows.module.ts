import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { AuthModule } from '../auth';
import { WorkflowsController } from './controllers/workflows.controller';
import { ExternalWorkflow, Workflow } from './entities';
import { WorkflowsService } from './services/workflows.service';
import { RulesModule } from '../rules/rules.module';
import { ViolationsModule } from '../violations/violations.module';
import { WorkflowQueueService } from './services/workflow-queue.service';
import { WorkflowQueueProcessor } from './services/workflow-queue.processor';
import { SigNozObservabilityService } from './services/signoz-observability.service';

import { WORKFLOWS_QUEUE } from './constants/queue.constants';
import { SigNozModule } from '../signoz';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([Workflow, ExternalWorkflow]),
    RulesModule,
    ViolationsModule,
    BullModule.registerQueue({
      name: WORKFLOWS_QUEUE,
    }),
    SigNozModule,
  ],
  controllers: [WorkflowsController],
  providers: [
    WorkflowsService,
    WorkflowQueueService,
    WorkflowQueueProcessor,
    SigNozObservabilityService,
  ],
  exports: [WorkflowsService, WorkflowQueueService],
})
export class WorkflowsModule {}
