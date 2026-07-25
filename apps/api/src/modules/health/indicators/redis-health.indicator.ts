import { Injectable } from '@nestjs/common';
import {
  HealthIndicator,
  HealthIndicatorResult,
  HealthCheckError,
} from '@nestjs/terminus';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
  constructor(private readonly configService: ConfigService) {
    super();
  }

  async isHealthy(key: string): Promise<HealthIndicatorResult> {
    const host = this.configService.get<string>('redis.host') || 'localhost';
    const port = this.configService.get<number>('redis.port') || 6379;

    const client = new Redis({
      host,
      port,
      username: this.configService.get<string>('redis.username'),
      password: this.configService.get<string>('redis.password'),
      tls: this.configService.get<boolean>('redis.tls') ? {} : undefined,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
      connectTimeout: 2000,
    });

    try {
      await client.connect();
      const status = await client.ping();
      await client.quit();
      return this.getStatus(key, status === 'PONG');
    } catch (error: unknown) {
      await client.quit().catch(() => {});
      const message =
        error instanceof Error ? error.message : 'Unknown Redis error';
      throw new HealthCheckError(
        'Redis health check failed',
        this.getStatus(key, false, { message }),
      );
    }
  }
}
