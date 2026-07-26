import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { BusinessesModule } from '../businesses';
import { RulesModule } from '../rules/rules.module';
import { WorkflowsModule } from '../workflows/workflows.module';
import { TelemetryModule } from '../telemetry';
import { EventsController } from './controllers/events.controller';
import { EventLogsController } from './controllers/event-logs.controller';
import { PublicEventsController } from './controllers/public-events.controller';
import { BusinessEvent, EventIngestIdempotency, EventLog } from './entities';
import { EventLogsService } from './services/event-logs.service';
import { EventsService } from './services/events.service';
import { PublicEventsService } from './services/public-events.service';
import { WorkflowEngineService } from './services/workflow-engine.service';
import { ViolationsModule } from '../violations/violations.module';

@Module({
  imports: [
    AuthModule,
    BusinessesModule,
    TypeOrmModule.forFeature([BusinessEvent, EventLog, EventIngestIdempotency]),
    RulesModule,
    WorkflowsModule,
    ViolationsModule,
    TelemetryModule,
  ],
  controllers: [EventsController, EventLogsController, PublicEventsController],
  providers: [
    EventsService,
    EventLogsService,
    PublicEventsService,
    WorkflowEngineService,
  ],
  exports: [EventsService, EventLogsService, PublicEventsService],
})
export class EventsModule {}
