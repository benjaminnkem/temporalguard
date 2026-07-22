import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
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
    EventEmitterModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
        },
      }),
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
