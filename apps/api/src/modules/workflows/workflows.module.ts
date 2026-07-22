import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BullModule } from '@nestjs/bullmq';
import { WorkflowsController } from './controllers/workflows.controller';
import { Workflow } from './entities';
import { WorkflowsService } from './services/workflows.service';
import { RulesModule } from '../rules/rules.module';
import { ViolationsModule } from '../violations/violations.module';
import { WorkflowQueueService } from './services/workflow-queue.service';
import { WorkflowQueueProcessor } from './services/workflow-queue.processor';

import { WORKFLOWS_QUEUE } from './constants/queue.constants';

@Module({
  imports: [
    TypeOrmModule.forFeature([Workflow]),
    RulesModule,
    ViolationsModule,
    BullModule.registerQueue({
      name: WORKFLOWS_QUEUE,
    }),
  ],
  controllers: [WorkflowsController],
  providers: [WorkflowsService, WorkflowQueueService, WorkflowQueueProcessor],
  exports: [WorkflowsService, WorkflowQueueService],
})
export class WorkflowsModule {}
