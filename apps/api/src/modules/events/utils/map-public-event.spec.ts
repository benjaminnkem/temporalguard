import { BadRequestException } from '@nestjs/common';
import {
  mapPublicEventToIngest,
  resolveExternalWorkflowId,
} from './map-public-event';

describe('mapPublicEventToIngest', () => {
  const baseTimestamp = new Date().toISOString();

  it('maps correlation to externalWorkflowId and nested _tg metadata', () => {
    const mapped = mapPublicEventToIngest({
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
    });

    expect(mapped.dto.eventName).toBe('document.uploaded');
    expect(mapped.dto.externalWorkflowId).toBe('document.id:doc_123');
    expect(mapped.dto.payload).toMatchObject({
      region: 'eu-west-1',
      _tg: {
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
