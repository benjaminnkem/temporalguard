import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class CompanyConcurrencyService implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly limit: number;
  private readonly prefix: string;

  constructor(config: ConfigService) {
    this.redis = new Redis({
      host: config.get<string>('redis.host'),
      port: config.get<number>('redis.port'),
      username: config.get<string>('redis.username'),
      password: config.get<string>('redis.password'),
      tls: config.get<boolean>('redis.tls') ? {} : undefined,
      maxRetriesPerRequest: null,
    });
    this.limit = config.get<number>('queue.maxConcurrentPerCompany') ?? 3;
    this.prefix = config.get<string>('queue.prefix') ?? 'temporalguard';
  }

  async acquire(businessId: string, leaseId: string): Promise<boolean> {
    const key = `${this.prefix}:company:${businessId}:active-jobs`;
    const leaseKey = `${key}:${leaseId}`;
    const result = await this.redis.eval(
      `
        if redis.call('EXISTS', KEYS[2]) == 1 then return 1 end
        local current = tonumber(redis.call('GET', KEYS[1]) or '0')
        if current >= tonumber(ARGV[1]) then return 0 end
        redis.call('INCR', KEYS[1])
        redis.call('PEXPIRE', KEYS[1], ARGV[2])
        redis.call('SET', KEYS[2], '1', 'PX', ARGV[2])
        return 1
      `,
      2,
      key,
      leaseKey,
      this.limit,
      15 * 60 * 1000,
    );
    return Number(result) === 1;
  }

  async release(businessId: string, leaseId: string): Promise<void> {
    const key = `${this.prefix}:company:${businessId}:active-jobs`;
    const leaseKey = `${key}:${leaseId}`;
    await this.redis.eval(
      `
        if redis.call('DEL', KEYS[2]) == 1 then
          local current = tonumber(redis.call('GET', KEYS[1]) or '0')
          if current <= 1 then redis.call('DEL', KEYS[1])
          else redis.call('DECR', KEYS[1]) end
        end
        return 1
      `,
      2,
      key,
      leaseKey,
    );
  }

  async isHealthy(): Promise<boolean> {
    try {
      return (await this.redis.ping()) === 'PONG';
    } catch {
      return false;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }
}
