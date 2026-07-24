import { ConfigService } from '@nestjs/config';
import type { Workflow } from '../entities';
import { SigNozObservabilityService } from './signoz-observability.service';

const workflow = {
  id: '8d6513a2-eaf8-47d1-9c33-8edaa96f7881',
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
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('returns a configuration state without calling SigNoz when query access is missing', async () => {
    const service = new SigNozObservabilityService(
      new ConfigService({
        signoz: { uiUrl: 'https://example.signoz.cloud' },
      }),
    );
    const fetchSpy = jest.spyOn(global, 'fetch');

    const result = await service.queryTraces(workflow);

    expect(result.configured).toBe(false);
    expect(result.items).toEqual([]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('queries and normalizes live trace rows using the service-account header', async () => {
    const service = new SigNozObservabilityService(
      new ConfigService({
        signoz: {
          apiUrl: 'https://example.signoz.cloud',
          apiKey: 'test-service-account-key',
          uiUrl: 'https://example.signoz.cloud',
          queryTimeoutMs: 1000,
        },
      }),
    );
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          data: {
            result: [
              {
                queryName: 'workflow_traces',
                rows: [
                  {
                    data: {
                      trace_id: '0123456789abcdef0123456789abcdef',
                      name: 'Workflow Created',
                    },
                  },
                ],
              },
            ],
          },
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    );

    const result = await service.queryTraces(workflow);

    expect(result.configured).toBe(true);
    expect(result.items).toEqual([
      {
        trace_id: '0123456789abcdef0123456789abcdef',
        name: 'Workflow Created',
      },
    ]);
    expect(result.explorerUrl).toBe(
      'https://example.signoz.cloud/trace/0123456789abcdef0123456789abcdef',
    );
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] ?? [];
    expect(url).toBe('https://example.signoz.cloud/api/v5/query_range');
    expect(new Headers(init?.headers).get('SIGNOZ-API-KEY')).toBe(
      'test-service-account-key',
    );
    expect(typeof init?.body === 'string' ? init.body : '').toContain(
      workflow.id,
    );
  });
});
