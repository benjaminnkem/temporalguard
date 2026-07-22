import { Module } from '@nestjs/common';
import { TelemetryService } from './services/telemetry.service';
import { TelemetryListener } from './listeners/telemetry.listener';

@Module({
  providers: [TelemetryService, TelemetryListener],
  exports: [TelemetryService],
})
export class TelemetryModule {}
