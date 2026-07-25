import { BadRequestException } from '@nestjs/common';
import {
  ApiKeyEnvironment,
  toProductEnvironment,
} from '../../businesses/enums/api-key-environment.enum';
import type { CreateEventLogDto } from '../dto/create-event-log.dto';
import type { TrackEventDto } from '../dto/track-event.dto';

const MAX_PROPERTY_KEYS = 50;
const MAX_PROPERTY_DEPTH = 3;
const MAX_STRING_VALUE_BYTES = 2 * 1024;
const MAX_FUTURE_MS = 24 * 60 * 60 * 1000;
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export type MappedPublicEvent = {
  dto: CreateEventLogDto;
  traceId?: string;
  spanId?: string;
  idempotencyKey?: string;
};

function assertTimestamp(iso: string): void {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'timestamp must be a valid ISO-8601 date.',
      details: [{ path: 'timestamp', message: 'Invalid date' }],
    });
  }

  const now = Date.now();
  if (time - now > MAX_FUTURE_MS) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'timestamp cannot be more than 24 hours in the future.',
      details: [{ path: 'timestamp', message: 'Too far in the future' }],
    });
  }

  if (now - time > MAX_AGE_MS) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'timestamp cannot be more than 30 days in the past.',
      details: [{ path: 'timestamp', message: 'Too far in the past' }],
    });
  }
}

function assertProperties(
  properties: Record<string, unknown> | undefined,
): void {
  if (!properties) return;

  if (Object.prototype.hasOwnProperty.call(properties, '_tg')) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: 'properties._tg is reserved.',
      details: [{ path: 'properties._tg', message: 'Reserved namespace' }],
    });
  }

  const keys = Object.keys(properties);
  if (keys.length > MAX_PROPERTY_KEYS) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `properties may contain at most ${MAX_PROPERTY_KEYS} keys.`,
      details: [{ path: 'properties', message: 'Too many keys' }],
    });
  }

  walkProperties(properties, 1, 'properties');
}

function walkProperties(value: unknown, depth: number, path: string): void {
  if (value === null || value === undefined) return;

  if (typeof value === 'string') {
    if (Buffer.byteLength(value, 'utf8') > MAX_STRING_VALUE_BYTES) {
      throw new BadRequestException({
        code: 'VALIDATION_ERROR',
        message: `String values in properties may be at most ${MAX_STRING_VALUE_BYTES} bytes.`,
        details: [{ path, message: 'Value too long' }],
      });
    }
    return;
  }

  if (typeof value !== 'object') return;

  if (depth > MAX_PROPERTY_DEPTH) {
    throw new BadRequestException({
      code: 'VALIDATION_ERROR',
      message: `properties may nest at most ${MAX_PROPERTY_DEPTH} levels.`,
      details: [{ path, message: 'Too deep' }],
    });
  }

  if (Array.isArray(value)) {
    value.forEach((item, index) => {
      walkProperties(item, depth + 1, `${path}[${index}]`);
    });
    return;
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    walkProperties(child, depth + 1, `${path}.${key}`);
  }
}

export function resolveExternalWorkflowId(input: TrackEventDto): string {
  const externalId = input.externalId?.trim();
  if (externalId) {
    return externalId;
  }

  const key = input.correlation?.key?.trim();
  const value = input.correlation?.value?.trim();
  if (key && value) {
    return `${key}:${value}`;
  }

  throw new BadRequestException({
    code: 'VALIDATION_ERROR',
    message:
      'Either correlation (key + value) or externalId is required for workflow binding.',
    details: [
      {
        path: 'correlation',
        message: 'Required unless externalId is provided',
      },
    ],
  });
}

export function mapPublicEventToIngest(
  input: TrackEventDto,
  apiEnvironment: ApiKeyEnvironment = ApiKeyEnvironment.LIVE,
): MappedPublicEvent {
  assertTimestamp(input.timestamp);
  assertProperties(input.properties);

  const externalWorkflowId = resolveExternalWorkflowId(input);
  const productEnvironment = toProductEnvironment(apiEnvironment);
  const tgMeta: Record<string, unknown> = {
    apiEnvironment,
    environment: productEnvironment,
  };

  if (input.correlation?.key && input.correlation?.value) {
    tgMeta.correlation = {
      key: input.correlation.key,
      value: input.correlation.value,
    };
  }

  if (input.context?.service) tgMeta.service = input.context.service;
  if (input.context?.deployment) tgMeta.deployment = input.context.deployment;
  if (input.idempotencyKey) tgMeta.idempotencyKey = input.idempotencyKey;

  const payload: Record<string, unknown> = {
    ...(input.properties ?? {}),
    _tg: tgMeta,
  };

  return {
    dto: {
      eventName: input.event,
      timestamp: input.timestamp,
      externalWorkflowId,
      payload,
    },
    traceId: input.context?.traceId,
    spanId: input.context?.spanId,
    idempotencyKey: input.idempotencyKey,
  };
}

export function resolveProductEnvironmentFromPayload(
  payload: Record<string, unknown> | null | undefined,
): string {
  const tg = payload?._tg;
  if (tg && typeof tg === 'object' && !Array.isArray(tg)) {
    const meta = tg as Record<string, unknown>;
    if (meta.environment === 'production' || meta.environment === 'staging') {
      return meta.environment;
    }
    if (meta.apiEnvironment === 'test' || meta.apiEnvironment === 'live') {
      return toProductEnvironment(meta.apiEnvironment);
    }
  }
  return 'production';
}

export function ruleMatchesEnvironment(
  ruleEnvironments: string[] | null | undefined,
  productEnvironment: string,
): boolean {
  if (!ruleEnvironments || ruleEnvironments.length === 0) {
    return true;
  }
  return ruleEnvironments.includes(productEnvironment);
}
