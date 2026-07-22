import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { configuration } from './config';
import { DatabaseModule } from './database';
import {
  DashboardModule,
  EventsModule,
  HealthModule,
  RulesModule,
  TelemetryModule,
  ViolationsModule,
  WorkflowsModule,
} from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['.env', '../../.env'],
    }),
    DatabaseModule,
    HealthModule,
    DashboardModule,
    RulesModule,
    EventsModule,
    WorkflowsModule,
    ViolationsModule,
    TelemetryModule,
  ],
})
export class AppModule {}
