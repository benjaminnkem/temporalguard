import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SigNozConnection, SigNozQueryAudit } from '../processing/entities';
import { ProcessingModule } from '../processing/processing.module';
import { TelemetryModule } from '../telemetry/telemetry.module';
import { SigNozController } from './signoz.controller';
import { SigNozLinkBuilder } from './signoz-link-builder.service';
import { SigNozQueryClient } from './signoz-query-client.service';
import { AuthModule } from '../auth';

@Module({
  imports: [
    TypeOrmModule.forFeature([SigNozConnection, SigNozQueryAudit]),
    AuthModule,
    ProcessingModule,
    TelemetryModule,
  ],
  controllers: [SigNozController],
  providers: [SigNozQueryClient, SigNozLinkBuilder],
  exports: [SigNozQueryClient, SigNozLinkBuilder],
})
export class SigNozModule {}
