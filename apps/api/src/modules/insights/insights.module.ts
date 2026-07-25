import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth';
import { EventLog } from '../events/entities';
import {
  DeploymentObservation,
  Investigation,
  RuleSimulation,
  SigNozConnection,
  SigNozQueryAudit,
  TelemetryQualitySnapshot,
  WorkflowComparison,
} from '../processing/entities';
import { ProcessingModule } from '../processing';
import { Workflow } from '../workflows/entities';
import { InsightsController } from './insights.controller';
import { InsightsService } from './insights.service';

@Module({
  imports: [
    AuthModule,
    ProcessingModule,
    TypeOrmModule.forFeature([
      Workflow,
      EventLog,
      WorkflowComparison,
      RuleSimulation,
      DeploymentObservation,
      TelemetryQualitySnapshot,
      Investigation,
      SigNozConnection,
      SigNozQueryAudit,
    ]),
  ],
  controllers: [InsightsController],
  providers: [InsightsService],
})
export class InsightsModule {}
