import { Controller, Get } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  HealthCheck,
  HealthCheckService,
  TypeOrmHealthIndicator,
} from '@nestjs/terminus';
import { RedisHealthIndicator } from '../indicators/redis-health.indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: TypeOrmHealthIndicator,
    private readonly redis: RedisHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Health check' })
  @ApiOkResponse({
    description: 'Service health status',
  })
  check() {
    return this.ready();
  }

  @Get('live')
  @ApiOperation({ summary: 'Process liveness check' })
  live() {
    return { status: 'ok', service: 'temporalguard-api' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness check for traffic' })
  ready() {
    return this.health.check([
      () => this.db.pingCheck('database'),
      () => this.redis.isHealthy('redis'),
    ]);
  }

  @Get('dependencies')
  @HealthCheck()
  @ApiOperation({ summary: 'Dependency health details' })
  dependencies() {
    return this.ready();
  }
}
