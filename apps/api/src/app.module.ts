import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { configuration } from './config';
import { DatabaseModule } from './database';
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
} from './modules';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      envFilePath: ['../../.env', '.env'],
    }),
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
        },
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
  ],
  providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
