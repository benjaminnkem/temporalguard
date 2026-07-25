import { BadRequestException } from '@nestjs/common';
import { ApiKeyEnvironment } from '../../businesses/enums/api-key-environment.enum';
import {
  mapPublicEventToIngest,
  resolveExternalWorkflowId,
  resolveProductEnvironmentFromPayload,
  ruleMatchesEnvironment,
} from './map-public-event';

describe('mapPublicEventToIngest', () => {
  const baseTimestamp = new Date().toISOString();

  it('maps correlation to externalWorkflowId and nested _tg metadata', () => {
    const mapped = mapPublicEventToIngest(
      {
        event: 'document.uploaded',
        timestamp: baseTimestamp,
        correlation: { key: 'document.id', value: 'doc_123' },
        properties: { region: 'eu-west-1' },
        context: {
          service: 'documents-api',
          deployment: 'v1',
          traceId: 'trace-1',
          spanId: 'span-1',
        },
        idempotencyKey: 'idem-1',
      },
      ApiKeyEnvironment.LIVE,
    );

    expect(mapped.dto.eventName).toBe('document.uploaded');
    expect(mapped.dto.externalWorkflowId).toBe('document.id:doc_123');
    expect(mapped.dto.payload).toMatchObject({
      region: 'eu-west-1',
      _tg: {
        apiEnvironment: 'live',
        environment: 'production',
        correlation: { key: 'document.id', value: 'doc_123' },
        service: 'documents-api',
        deployment: 'v1',
        idempotencyKey: 'idem-1',
      },
    });
    expect(mapped.traceId).toBe('trace-1');
    expect(mapped.spanId).toBe('span-1');
    expect(mapped.idempotencyKey).toBe('idem-1');
  });

  it('maps test keys to staging product environment', () => {
    const mapped = mapPublicEventToIngest(
      {
        event: 'document.uploaded',
        timestamp: baseTimestamp,
        externalId: 'wf_1',
      },
      ApiKeyEnvironment.TEST,
    );
    expect(mapped.dto.payload).toMatchObject({
      _tg: { apiEnvironment: 'test', environment: 'staging' },
    });
  });

  it('prefers externalId over correlation for workflow binding', () => {
    expect(
      resolveExternalWorkflowId({
        event: 'x',
        timestamp: baseTimestamp,
        externalId: 'wf_1',
        correlation: { key: 'document.id', value: 'doc_123' },
      }),
    ).toBe('wf_1');
  });

  it('rejects reserved properties._tg', () => {
    expect(() =>
      mapPublicEventToIngest({
        event: 'document.uploaded',
        timestamp: baseTimestamp,
        externalId: 'wf_1',
        properties: { _tg: { hack: true } },
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects missing correlation and externalId', () => {
    expect(() =>
      mapPublicEventToIngest({
        event: 'document.uploaded',
        timestamp: baseTimestamp,
      }),
    ).toThrow(BadRequestException);
  });

  it('rejects timestamps too far in the future', () => {
    const future = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    expect(() =>
      mapPublicEventToIngest({
        event: 'document.uploaded',
        timestamp: future,
        externalId: 'wf_1',
      }),
    ).toThrow(BadRequestException);
  });
});

describe('environment helpers', () => {
  it('resolves product environment from payload', () => {
    expect(
      resolveProductEnvironmentFromPayload({
        _tg: { environment: 'staging' },
      }),
    ).toBe('staging');
    expect(resolveProductEnvironmentFromPayload({})).toBe('production');
  });

  it('matches rules that include the environment', () => {
    expect(ruleMatchesEnvironment(['production'], 'production')).toBe(true);
    expect(ruleMatchesEnvironment(['production'], 'staging')).toBe(false);
    expect(ruleMatchesEnvironment([], 'staging')).toBe(true);
  });
});
