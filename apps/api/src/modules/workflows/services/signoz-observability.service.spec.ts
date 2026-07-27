import {
  BadGatewayException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Workflow } from '../entities';
import { SigNozObservabilityService } from './signoz-observability.service';

const workflow = {
  id: '8d6513a2-eaf8-47d1-9c33-8edaa96f7881',
  businessId: '11111111-1111-4111-8111-111111111111',
  status: 'waiting',
  createdAt: new Date('2026-07-24T14:30:00.000Z'),
  updatedAt: new Date('2026-07-24T14:35:00.000Z'),
  externalWorkflow: {
    eventLogs: [
      {
        timestamp: new Date('2026-07-24T14:32:32.598Z'),
        traceId: '0123456789abcdef0123456789abcdef',
      },
    ],
  },
} as Workflow;

describe('SigNozObservabilityService', () => {
  it('returns a configuration state when the server-side client is unavailable', async () => {
    const client = {
      queryTraces: jest.fn().mockRejectedValue(
        new ServiceUnavailableException({
          code: 'SIGNOZ_NOT_CONFIGURED',
          message: 'SigNoz connection is not configured',
        }),
      ),
    };
    const service = new SigNozObservabilityService(
      client as never,
      {
        build: jest.fn(() => 'https://example.signoz.cloud/traces-explorer'),
      } as never,
    );

    const result = await service.queryTraces(workflow);

    expect(result.configured).toBe(false);
    expect(result.errorCode).toBe('SIGNOZ_NOT_CONFIGURED');
    expect(result.message).toBe('SigNoz query access is not configured.');
    expect(result.items).toEqual([]);
  });

  it('distinguishes an open circuit from missing configuration', async () => {
    const client = {
      queryTraces: jest.fn().mockRejectedValue(
        new ServiceUnavailableException({
          code: 'SIGNOZ_CIRCUIT_OPEN',
          message: 'SigNoz circuit breaker is open',
        }),
      ),
    };
    const service = new SigNozObservabilityService(
      client as never,
      { build: jest.fn(() => undefined) } as never,
    );

    const result = await service.queryTraces(workflow);

    expect(result.configured).toBe(true);
    expect(result.errorCode).toBe('SIGNOZ_CIRCUIT_OPEN');
  });

  it('returns a structured preview error when SigNoz rejects a query', async () => {
    const client = {
      queryTraces: jest.fn().mockRejectedValue(
        new BadGatewayException({
          code: 'SIGNOZ_QUERY_FAILED',
          message: 'SigNoz query failed',
          details: { status: 400 },
        }),
      ),
    };
    const service = new SigNozObservabilityService(
      client as never,
      { build: jest.fn(() => undefined) } as never,
    );

    const result = await service.queryTraces(workflow);

    expect(result).toMatchObject({
      configured: true,
      errorCode: 'SIGNOZ_QUERY_FAILED',
      message: 'SigNoz rejected the telemetry query (status 400).',
      items: [],
    });
  });

  it('uses the safe company-scoped query client and normalizes its result', async () => {
    const client = {
      queryTraces: jest.fn().mockResolvedValue({
        queryId: 'query-1',
        signal: 'traces',
        from: '2026-07-24T14:25:00.000Z',
        to: '2026-07-24T14:40:00.000Z',
        rows: [{ trace_id: '0123456789abcdef0123456789abcdef' }],
        truncated: false,
      }),
    };
    const link = 'https://example.signoz.cloud/trace/trace-id';
    const service = new SigNozObservabilityService(
      client as never,
      { build: jest.fn(() => link) } as never,
    );

    const result = await service.queryTraces(workflow);

    expect(result.configured).toBe(true);
    expect(result.items).toHaveLength(1);
    expect(result.explorerUrl).toBe(link);
    expect(client.queryTraces).toHaveBeenCalledWith(
      expect.objectContaining({
        businessId: workflow.businessId,
        filters: [
          {
            field: 'temporalguard.workflow.id',
            operator: 'eq',
            value: workflow.id,
          },
        ],
      }),
    );
  });
});
