import { Module } from '@nestjs/common';
import { TelemetryService } from './services/telemetry.service';

@Module({
  providers: [TelemetryService],
  exports: [TelemetryService],
})
export class TelemetryModule {}
