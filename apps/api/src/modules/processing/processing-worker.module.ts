import { Module } from '@nestjs/common';
import { ProcessingModule } from './processing.module';
import { ProcessingProcessor } from './services/processing.processor';
import { InvestigationsModule } from '../investigations';
import { TelemetryModule } from '../telemetry';

@Module({
  imports: [ProcessingModule, InvestigationsModule, TelemetryModule],
  providers: [ProcessingProcessor],
})
export class ProcessingWorkerModule {}
