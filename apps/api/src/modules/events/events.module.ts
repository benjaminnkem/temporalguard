import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { RulesModule } from '../rules/rules.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { EventsController } from './controllers/events.controller';
import { EventLogsController } from './controllers/event-logs.controller';
import { BusinessEvent, EventLog } from './entities';
import { EventLogsService } from './services/event-logs.service';
import { EventsService } from './services/events.service';
import { WorkflowEngineService } from './services/workflow-engine.service';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([BusinessEvent, EventLog]),
    RulesModule,
    WorkflowsModule,
  ],
  controllers: [EventsController, EventLogsController],
  providers: [EventsService, EventLogsService, WorkflowEngineService],
  exports: [EventsService, EventLogsService],
})
export class EventsModule {}
