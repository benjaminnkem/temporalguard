import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration, validateEnvironment } from './config';
import { DatabaseModule } from './database';
import { FeatureFlagsModule } from './common';
import {
  DashboardModule,
  AuthModule,
  BusinessesModule,
  EventsModule,
  HealthModule,
  RulesModule,
  TelemetryModule,
  MediaModule,
  UsersModule,
  ViolationsModule,
  WorkflowsModule,
  ProcessingModule,
  SigNozModule,
  InvestigationsModule,
  InsightsModule,
} from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate: validateEnvironment,
      envFilePath: ['../../.env', '.env'],
    }),
    FeatureFlagsModule,
    EventEmitterModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 120,
      },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('redis.host'),
          port: configService.get<number>('redis.port'),
          username: configService.get<string>('redis.username'),
          password: configService.get<string>('redis.password'),
          tls: configService.get<boolean>('redis.tls') ? {} : undefined,
        },
        prefix: configService.get<string>('queue.prefix'),
      }),
    }),
    DatabaseModule,
    BusinessesModule,
    UsersModule,
    MediaModule,
    AuthModule,
    HealthModule,
    DashboardModule,
    RulesModule,
    EventsModule,
    WorkflowsModule,
    ViolationsModule,
    TelemetryModule,
    ProcessingModule,
    SigNozModule,
    InvestigationsModule,
    InsightsModule,
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
