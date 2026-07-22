import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RulesModule } from '../rules/rules.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { EventsController } from './controllers/events.controller';
import { BusinessEvent } from './entities';
import { EventsService } from './services/events.service';
import { WorkflowEngineService } from './services/workflow-engine.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([BusinessEvent]),
    RulesModule,
    WorkflowsModule,
  ],
  controllers: [EventsController],
  providers: [EventsService, WorkflowEngineService],
  exports: [EventsService],
})
export class EventsModule {}
