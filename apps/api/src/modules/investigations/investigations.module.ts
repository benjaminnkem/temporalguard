import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import {
  Evidence,
  Investigation,
  InvestigationStreamEvent,
} from '../processing/entities';
import { ProcessingModule } from '../processing/processing.module';
import { Violation } from '../violations/entities';
import { Workflow } from '../workflows/entities';
import { Rule } from '../rules/entities';
import { SigNozModule } from '../signoz';
import { TelemetryModule } from '../telemetry';
import {
  AgentRun,
  TelemetryQualitySnapshot,
  WorkflowComparison,
} from '../processing/entities';
import { InvestigationEngine } from './investigation-engine.service';
import { InvestigationProvider } from './investigation-provider.service';
import { InvestigationStreamService } from './investigation-stream.service';
import { InvestigationsController } from './investigations.controller';
import { InvestigationsService } from './investigations.service';

@Module({
  imports: [
    AuthModule,
    ProcessingModule,
    SigNozModule,
    TelemetryModule,
    TypeOrmModule.forFeature([
      Investigation,
      InvestigationStreamEvent,
      Evidence,
      Violation,
      Workflow,
      Rule,
      AgentRun,
      TelemetryQualitySnapshot,
      WorkflowComparison,
    ]),
  ],
  controllers: [InvestigationsController],
  providers: [
    InvestigationsService,
    InvestigationStreamService,
    InvestigationProvider,
    InvestigationEngine,
  ],
  exports: [
    InvestigationsService,
    InvestigationStreamService,
    InvestigationEngine,
  ],
})
export class InvestigationsModule {}
