import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import Redis from 'ioredis';
import { Repository } from 'typeorm';
import { z } from 'zod';
import { SigNozConnection, SigNozQueryAudit } from '../processing/entities';
import { EncryptionService } from '../processing/services/encryption.service';
import { TelemetryService } from '../telemetry/services/telemetry.service';
import {
  allowedSelectFields,
  assertAllowedFilters,
  assertMetricName,
} from './signoz-policy';
import { redactTelemetry } from './signoz-redaction';
import type {
  SigNozConnectionHealth,
  SafeFilter,
  SigNozQueryInput,
  SigNozQueryResult,
} from './signoz.types';
import { safeFilterSchema } from './signoz.types';

const responseSchema = z.object({ data: z.unknown().optional() }).passthrough();

type Connection = {
  id: string;
  apiUrl: string;
  apiKey: string;
};

type Breaker = { failures: number; openUntil: number };

@Injectable()
export class SigNozQueryClient implements OnModuleDestroy {
  private readonly redis: Redis;
  private readonly breakers = new Map<string, Breaker>();

  constructor(
    private readonly config: ConfigService,
    @InjectRepository(SigNozConnection)
    private readonly connections: Repository<SigNozConnection>,
    @InjectRepository(SigNozQueryAudit)
    private readonly audits: Repository<SigNozQueryAudit>,
    private readonly encryption: EncryptionService,
    private readonly telemetry: TelemetryService,
  ) {
    this.redis = new Redis({
      host: config.get<string>('redis.host'),
      port: config.get<number>('redis.port'),
      username: config.get<string>('redis.username'),
      password: config.get<string>('redis.password'),
      tls: config.get<boolean>('redis.tls') ? {} : undefined,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
    });
    this.redis.on('error', () => undefined);
  }

  queryTraces(
    input: Omit<SigNozQueryInput, 'signal' | 'metric'>,
  ): Promise<SigNozQueryResult> {
    return this.query({ ...input, signal: 'traces' });
  }

  queryLogs(
    input: Omit<SigNozQueryInput, 'signal' | 'metric'>,
  ): Promise<SigNozQueryResult> {
    return this.query({ ...input, signal: 'logs' });
  }

  queryMetrics(
    input: Omit<SigNozQueryInput, 'signal'> & {
      metric: NonNullable<SigNozQueryInput['metric']>;
    },
  ): Promise<SigNozQueryResult> {
    return this.query({ ...input, signal: 'metrics' });
  }

  async validateConnection(
    businessId: string,
  ): Promise<SigNozConnectionHealth> {
    const started = Date.now();
    try {
      const connection = await this.connectionFor(businessId);
      const authentication = await fetch(
        `${connection.apiUrl.replace(/\/+$/, '')}/api/v1/service_accounts/me`,
        {
          headers: { 'SIGNOZ-API-KEY': connection.apiKey },
          signal: AbortSignal.timeout(
            this.config.get<number>('signoz.queryTimeoutMs') ?? 10_000,
          ),
        },
      );
      if (!authentication.ok) {
        const health: SigNozConnectionHealth = {
          configured: true,
          authenticated: false,
          traces: false,
          logs: false,
          metrics: false,
          latencyMs: Date.now() - started,
          errorCode:
            authentication.status === 401 || authentication.status === 403
              ? 'SIGNOZ_UNAUTHORIZED'
              : 'SIGNOZ_VALIDATION_FAILED',
        };
        await this.persistConnectionHealth(businessId, health);
        return health;
      }
      const now = new Date();
      const from = new Date(now.getTime() - 5 * 60_000);
      const base = { businessId, from, to: now, filters: [], limit: 1 };
      const results = await Promise.allSettled([
        this.queryTraces(base),
        this.queryLogs(base),
        this.queryMetrics({
          ...base,
          metric: {
            name: 'workflows_started_total',
            timeAggregation: 'sum',
            spaceAggregation: 'sum',
          },
        }),
      ]);
      const health: SigNozConnectionHealth = {
        configured: true,
        authenticated: true,
        traces: results[0].status === 'fulfilled',
        logs: results[1].status === 'fulfilled',
        metrics: results[2].status === 'fulfilled',
        latencyMs: Date.now() - started,
      };
      await this.persistConnectionHealth(businessId, health);
      return health;
    } catch (error: unknown) {
      const health: SigNozConnectionHealth = {
        configured: !(
          error instanceof ServiceUnavailableException &&
          error.getStatus() === 503
        ),
        authenticated: false,
        traces: false,
        logs: false,
        metrics: false,
        latencyMs: Date.now() - started,
        errorCode:
          error instanceof Error
            ? error.message.slice(0, 120)
            : 'SIGNOZ_VALIDATION_FAILED',
      };
      await this.persistConnectionHealth(businessId, health);
      return health;
    }
  }

  async query(input: SigNozQueryInput): Promise<SigNozQueryResult> {
    this.validate(input);
    await this.enforceRateLimit(input.businessId);
    const connection = await this.connectionFor(input.businessId);
    this.assertCircuitClosed(connection.id);
    const queryId = createHash('sha256')
      .update(
        JSON.stringify({
          businessId: input.businessId,
          investigationId: input.investigationId,
          signal: input.signal,
          from: input.from.toISOString(),
          to: input.to.toISOString(),
          filters: input.filters,
          limit: input.limit,
          metric: input.metric,
        }),
      )
      .digest('hex');
    const limit = Math.min(input.limit ?? 100, this.maxRows(input.signal));
    const body = this.buildBody(input, limit);
    const started = Date.now();
    let outcome = 'success';
    let statusCode: number | null = null;
    let errorCode: string | null = null;
    let returnedRows = 0;
    try {
      const raw = await this.telemetry.trace(
        'temporalguard.signoz.query',
        {
          'temporalguard.company.id_hash': this.companyHash(input.businessId),
          'temporalguard.investigation.id': input.investigationId ?? '',
          'temporalguard.signoz.signal': input.signal,
          'temporalguard.signoz.query_id': queryId,
        },
        () =>
          this.request(connection, body, input.abortSignal, (status) => {
            statusCode = status;
          }),
      );
      const parsed = responseSchema.parse(raw);
      const rows = this.extractRows(parsed.data).slice(0, limit);
      returnedRows = rows.length;
      this.breakers.delete(connection.id);
      return {
        queryId,
        signal: input.signal,
        from: input.from.toISOString(),
        to: input.to.toISOString(),
        rows: rows.map(
          (row) => redactTelemetry(row) as Record<string, unknown>,
        ),
        truncated: this.extractRows(parsed.data).length > limit,
      };
    } catch (error: unknown) {
      outcome = 'failed';
      errorCode =
        error instanceof Error ? error.message.slice(0, 120) : 'UNKNOWN';
      this.recordFailure(connection.id);
      this.telemetry.signozQueryFailed(input.signal, input.businessId);
      throw error;
    } finally {
      await this.audits.save(
        this.audits.create({
          businessId: input.businessId,
          investigationId: input.investigationId ?? null,
          signal: input.signal,
          queryHash: queryId,
          rangeStart: input.from,
          rangeEnd: input.to,
          requestedLimit: limit,
          returnedRows,
          durationMs: Date.now() - started,
          outcome,
          statusCode,
          errorCode,
        }),
      );
    }
  }

  private validate(input: SigNozQueryInput): void {
    const filters = safeFilterSchema.array().max(20).safeParse(input.filters);
    if (!filters.success) {
      throw new BadRequestException({
        code: 'SIGNOZ_FILTER_INVALID',
        message: 'SigNoz filters are invalid',
      });
    }
    if (
      input.limit !== undefined &&
      (!Number.isInteger(input.limit) || input.limit < 1)
    ) {
      throw new BadRequestException({
        code: 'SIGNOZ_LIMIT_INVALID',
        message: 'Query limit must be a positive integer',
      });
    }
    if (
      Number.isNaN(input.from.getTime()) ||
      Number.isNaN(input.to.getTime()) ||
      input.to <= input.from
    ) {
      throw new BadRequestException({
        code: 'SIGNOZ_RANGE_INVALID',
        message: 'Query range is invalid',
      });
    }
    const maxHours = this.config.get<number>('signoz.queryMaxRangeHours') ?? 24;
    if (input.to.getTime() - input.from.getTime() > maxHours * 3_600_000) {
      throw new BadRequestException({
        code: 'SIGNOZ_RANGE_EXCEEDED',
        message: `Query range cannot exceed ${maxHours} hours`,
      });
    }
    assertAllowedFilters(input.signal, input.filters);
    allowedSelectFields(input.signal, input.selectFields);
    if (input.signal === 'metrics') {
      if (!input.metric) {
        throw new BadRequestException({
          code: 'SIGNOZ_METRIC_REQUIRED',
          message: 'A metric query requires a metric',
        });
      }
      assertMetricName(input.metric.name);
    }
  }

  private buildBody(input: SigNozQueryInput, limit: number) {
    const companyFilter: SafeFilter = {
      field: 'temporalguard.company.id_hash',
      operator: 'eq',
      value: this.companyHash(input.businessId),
    };
    const filter = {
      expression: [...input.filters, companyFilter]
        .map((entry) => this.filterExpression(entry))
        .join(' AND '),
    };
    const spec =
      input.signal === 'metrics'
        ? {
            name: 'A',
            signal: input.signal,
            stepInterval: Math.max(
              15,
              Math.ceil(
                (input.to.getTime() - input.from.getTime()) / 1000 / 120,
              ),
            ),
            aggregations: [
              {
                metricName: input.metric?.name,
                temporality: 'Unspecified',
                timeAggregation: input.metric?.timeAggregation,
                spaceAggregation: input.metric?.spaceAggregation,
              },
            ],
            filter,
            disabled: false,
          }
        : {
            name: 'A',
            signal: input.signal,
            filter,
            selectFields: allowedSelectFields(
              input.signal,
              input.selectFields,
            ).map((name) => ({ name })),
            order: [{ key: { name: 'timestamp' }, direction: 'desc' }],
            limit: limit + 1,
            offset: 0,
            disabled: false,
          };
    return {
      start: input.from.getTime(),
      end: input.to.getTime(),
      requestType: input.signal === 'metrics' ? 'time_series' : 'raw',
      variables: {},
      compositeQuery: {
        queries: [{ type: 'builder_query', spec }],
      },
    };
  }

  private filterExpression(filter: SafeFilter): string {
    const operators: Record<SafeFilter['operator'], string> = {
      eq: '=',
      neq: '!=',
      in: 'IN',
      not_in: 'NOT IN',
      exists: 'EXISTS',
      not_exists: 'NOT EXISTS',
      gt: '>',
      gte: '>=',
      lt: '<',
      lte: '<=',
    };
    if (filter.operator === 'exists' || filter.operator === 'not_exists') {
      return `${filter.field} ${operators[filter.operator]}`;
    }
    return `${filter.field} ${operators[filter.operator]} ${this.literal(filter.value)}`;
  }

  private literal(value: SafeFilter['value']): string {
    if (Array.isArray(value)) {
      return `[${value.map((item) => this.literal(item)).join(', ')}]`;
    }
    if (typeof value === 'string') {
      return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`;
    }
    return String(value);
  }

  private async request(
    connection: Connection,
    body: unknown,
    externalSignal: AbortSignal | undefined,
    setStatus: (status: number) => void,
  ): Promise<unknown> {
    if (externalSignal?.aborted) {
      throw new BadRequestException({
        code: 'SIGNOZ_QUERY_CANCELLED',
        message: 'SigNoz query was cancelled',
      });
    }
    const retries = this.config.get<number>('signoz.queryMaxRetries') ?? 2;
    const timeoutMs =
      this.config.get<number>('signoz.queryTimeoutMs') ?? 10_000;
    for (let attempt = 0; ; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);
      const abort = () => controller.abort();
      externalSignal?.addEventListener('abort', abort, { once: true });
      try {
        const response = await fetch(
          `${connection.apiUrl.replace(/\/+$/, '')}/api/v5/query_range`,
          {
            method: 'POST',
            headers: {
              accept: 'application/json',
              'content-type': 'application/json',
              'SIGNOZ-API-KEY': connection.apiKey,
            },
            body: JSON.stringify(body),
            signal: controller.signal,
          },
        );
        setStatus(response.status);
        if (response.ok) return await response.json();
        if (
          attempt < retries &&
          (response.status === 429 || response.status >= 500)
        ) {
          await this.delay(Math.min(5000, 250 * 2 ** attempt), externalSignal);
          continue;
        }
        if (response.status === 429) {
          throw this.rateLimitError('SigNoz rate limit exceeded');
        }
        throw new BadGatewayException({
          code:
            response.status === 401 || response.status === 403
              ? 'SIGNOZ_UNAUTHORIZED'
              : 'SIGNOZ_QUERY_FAILED',
          message: 'SigNoz query failed',
          details: { status: response.status },
        });
      } catch (error: unknown) {
        if (
          attempt < retries &&
          !(error instanceof BadGatewayException) &&
          !externalSignal?.aborted
        ) {
          await this.delay(Math.min(5000, 250 * 2 ** attempt), externalSignal);
          continue;
        }
        if (externalSignal?.aborted) {
          throw new BadRequestException({
            code: 'SIGNOZ_QUERY_CANCELLED',
            message: 'SigNoz query was cancelled',
          });
        }
        throw error instanceof BadGatewayException ||
          (error instanceof HttpException && error.getStatus() === 429)
          ? error
          : new BadGatewayException({
              code: 'SIGNOZ_UNAVAILABLE',
              message: 'SigNoz is unavailable',
            });
      } finally {
        clearTimeout(timeout);
        externalSignal?.removeEventListener('abort', abort);
      }
    }
  }

  private async connectionFor(businessId: string): Promise<Connection> {
    const stored = await this.connections
      .createQueryBuilder('connection')
      .addSelect('connection.encryptedApiKey')
      .where('connection.businessId = :businessId', { businessId })
      .andWhere('connection.status != :disabled', { disabled: 'disabled' })
      .orderBy('connection.updatedAt', 'DESC')
      .getOne();
    if (stored) {
      return {
        id: stored.id,
        apiUrl: stored.apiUrl,
        apiKey: this.encryption.decrypt(stored.encryptedApiKey),
      };
    }
    const apiUrl = this.config.get<string>('signoz.apiUrl');
    const apiKey = this.config.get<string>('signoz.apiKey');
    if (!apiUrl || !apiKey) {
      throw new ServiceUnavailableException({
        code: 'SIGNOZ_NOT_CONFIGURED',
        message: 'SigNoz connection is not configured',
      });
    }
    return { id: 'platform', apiUrl, apiKey };
  }

  private async enforceRateLimit(businessId: string): Promise<void> {
    const limit = this.config.get<number>('signoz.rateLimitPerMinute') ?? 120;
    try {
      const key = `temporalguard:signoz-rate:${businessId}:${Math.floor(Date.now() / 60_000)}`;
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, 61);
      if (count > limit) {
        throw this.rateLimitError('Company SigNoz query rate exceeded');
      }
    } catch (error: unknown) {
      if (error instanceof HttpException && error.getStatus() === 429) {
        throw error;
      }
      throw new ServiceUnavailableException({
        code: 'REDIS_UNAVAILABLE',
        message: 'Query rate limiter is unavailable',
      });
    }
  }

  private assertCircuitClosed(connectionId: string): void {
    const breaker = this.breakers.get(connectionId);
    if (breaker && breaker.openUntil > Date.now()) {
      throw new ServiceUnavailableException({
        code: 'SIGNOZ_CIRCUIT_OPEN',
        message: 'SigNoz circuit breaker is open',
      });
    }
  }

  private recordFailure(connectionId: string): void {
    const threshold =
      this.config.get<number>('signoz.circuitBreakerThreshold') ?? 5;
    const resetMs =
      this.config.get<number>('signoz.circuitBreakerResetMs') ?? 30_000;
    const current = this.breakers.get(connectionId) ?? {
      failures: 0,
      openUntil: 0,
    };
    current.failures += 1;
    if (current.failures >= threshold) current.openUntil = Date.now() + resetMs;
    this.breakers.set(connectionId, current);
  }

  private companyHash(businessId: string): string {
    return createHash('sha256').update(businessId).digest('hex');
  }

  private async persistConnectionHealth(
    businessId: string,
    health: SigNozConnectionHealth,
  ): Promise<void> {
    await this.connections
      .createQueryBuilder()
      .update(SigNozConnection)
      .set({
        status:
          health.authenticated && health.traces && health.logs && health.metrics
            ? 'healthy'
            : health.authenticated
              ? 'degraded'
              : 'invalid',
        lastValidatedAt: new Date(),
        lastValidationErrorCode: health.errorCode ?? null,
      })
      .where('businessId = :businessId', { businessId })
      .execute()
      .catch(() => undefined);
  }

  private maxRows(signal: SigNozQueryInput['signal']): number {
    return signal === 'logs' ? 1000 : signal === 'traces' ? 500 : 100;
  }

  private rateLimitError(message: string): HttpException {
    return new HttpException(
      { code: 'SIGNOZ_RATE_LIMITED', message },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }

  private extractRows(value: unknown): Array<Record<string, unknown>> {
    const rows: Array<Record<string, unknown>> = [];
    let sawRowContainer = false;
    const visit = (nested: unknown, depth: number) => {
      if (depth > 8 || rows.length > 1001) return;
      if (Array.isArray(nested)) {
        nested.forEach((entry) => visit(entry, depth + 1));
        return;
      }
      if (typeof nested !== 'object' || nested === null) return;
      const record = nested as Record<string, unknown>;
      for (const [key, entry] of Object.entries(record)) {
        if (['rows', 'series', 'list'].includes(key) && Array.isArray(entry)) {
          sawRowContainer = true;
          entry.forEach((item) => {
            if (typeof item === 'object' && item !== null) {
              const itemRecord = item as Record<string, unknown>;
              rows.push(
                typeof itemRecord.data === 'object' && itemRecord.data !== null
                  ? (itemRecord.data as Record<string, unknown>)
                  : itemRecord,
              );
            }
          });
        } else {
          visit(entry, depth + 1);
        }
      }
    };
    visit(value, 0);
    if (
      rows.length === 0 &&
      !sawRowContainer &&
      typeof value === 'object' &&
      value !== null
    ) {
      rows.push(value as Record<string, unknown>);
    }
    return rows;
  }

  private delay(ms: number, signal?: AbortSignal): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(resolve, ms);
      signal?.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout);
          reject(new Error('cancelled'));
        },
        { once: true },
      );
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
