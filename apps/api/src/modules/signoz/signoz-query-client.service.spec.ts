import { createServer, type Server } from 'node:http';
import { AddressInfo } from 'node:net';
import { createHash } from 'node:crypto';
import { HttpException } from '@nestjs/common';
import { SigNozQueryClient } from './signoz-query-client.service';

jest.mock('ioredis', () => ({
  __esModule: true,
  default: class RedisMock {
    on() {}
    async quit() {}
  },
}));

async function captureError(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
    return undefined;
  } catch (error: unknown) {
    return error;
  }
}

describe('SigNozQueryClient', () => {
  let server: Server;
  let requests: Array<{
    headers: Record<string, string | string[] | undefined>;
    body: Record<string, unknown>;
  }>;
  let client: SigNozQueryClient;
  let responseStatus: number;
  let responseDelayMs: number;
  let queryMaxRetries: number;

  beforeEach(async () => {
    requests = [];
    responseStatus = 200;
    responseDelayMs = 0;
    queryMaxRetries = 0;
    server = createServer((request, response) => {
      let body = '';
      request.on('data', (chunk) => (body += String(chunk)));
      request.on('end', () => {
        requests.push({
          headers: request.headers,
          body: JSON.parse(body) as Record<string, unknown>,
        });
        setTimeout(() => {
          response.writeHead(responseStatus, {
            'content-type': 'application/json',
          });
          response.end(
            JSON.stringify({
              data: {
                rows: [
                  {
                    data: {
                      trace_id: 'a'.repeat(32),
                      authorization: 'Bearer should-not-leak',
                    },
                  },
                ],
              },
            }),
          );
        }, responseDelayMs);
      });
    });
    await new Promise<void>((resolve) => server.listen(0, resolve));
    const apiUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    const config = {
      get: jest.fn((key: string) => {
        const values: Record<string, unknown> = {
          'redis.host': '127.0.0.1',
          'redis.port': 1,
          'signoz.apiUrl': apiUrl,
          'signoz.apiKey': 'service-account-secret',
          'signoz.queryTimeoutMs': 2000,
          'signoz.queryMaxRetries': queryMaxRetries,
          'signoz.queryMaxRangeHours': 24,
        };
        return values[key];
      }),
    };
    const audits = {
      create: jest.fn((value: unknown) => value),
      save: jest.fn((value: unknown) => Promise.resolve(value)),
    };
    const telemetry = {
      signozQueryFailed: jest.fn(),
      trace: jest.fn(
        async (
          _name: string,
          _attributes: Record<string, unknown>,
          fn: () => Promise<unknown>,
        ) => fn(),
      ),
    };
    const queryBuilder = {
      addSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getOne: jest.fn().mockResolvedValue(null),
    };
    client = new SigNozQueryClient(
      config as never,
      { createQueryBuilder: jest.fn(() => queryBuilder) } as never,
      audits as never,
      { decrypt: jest.fn() } as never,
      telemetry as never,
    );
    jest
      .spyOn(
        client as unknown as { enforceRateLimit: () => Promise<void> },
        'enforceRateLimit',
      )
      .mockResolvedValue();
  });

  afterEach(async () => {
    await client.onModuleDestroy();
    await new Promise<void>((resolve, reject) =>
      server.close((error) => (error ? reject(error) : resolve())),
    );
  });

  it('uses service-account auth, forces a company filter, and redacts rows', async () => {
    const from = new Date(Date.now() - 60_000);
    const result = await client.queryTraces({
      businessId: '11111111-1111-4111-8111-111111111111',
      from,
      to: new Date(),
      filters: [],
    });
    expect(requests[0].headers['signoz-api-key']).toBe(
      'service-account-secret',
    );
    expect(JSON.stringify(requests[0].body)).toContain(
      createHash('sha256')
        .update('11111111-1111-4111-8111-111111111111')
        .digest('hex'),
    );
    expect(JSON.stringify(result.rows)).not.toContain('should-not-leak');
  });

  it('produces different enforced filters for different companies', async () => {
    const from = new Date(Date.now() - 60_000);
    for (const businessId of [
      '11111111-1111-4111-8111-111111111111',
      '22222222-2222-4222-8222-222222222222',
    ]) {
      await client.queryLogs({
        businessId,
        from,
        to: new Date(),
        filters: [],
      });
    }
    expect(JSON.stringify(requests[0].body)).not.toEqual(
      JSON.stringify(requests[1].body),
    );
  });

  it('surfaces a bounded upstream outage', async () => {
    responseStatus = 503;
    const error = await captureError(
      client.queryTraces({
        businessId: '11111111-1111-4111-8111-111111111111',
        from: new Date(Date.now() - 60_000),
        to: new Date(),
        filters: [],
      }),
    );
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getResponse()).toMatchObject({
      code: 'SIGNOZ_QUERY_FAILED',
    });
  });

  it('does not open the circuit for a rejected non-retryable query', async () => {
    responseStatus = 400;
    const input = {
      businessId: '11111111-1111-4111-8111-111111111111',
      from: new Date(Date.now() - 60_000),
      to: new Date(),
      filters: [],
    };
    for (let attempt = 0; attempt < 6; attempt += 1) {
      await expect(client.queryTraces(input)).rejects.toBeInstanceOf(
        HttpException,
      );
    }

    responseStatus = 200;
    await expect(client.queryTraces(input)).resolves.toMatchObject({
      rows: expect.any(Array),
    });
  });

  it('retries a transient outage and supports cancellation', async () => {
    queryMaxRetries = 1;
    let calls = 0;
    server.removeAllListeners('request');
    server.on('request', (request, response) => {
      request.resume();
      request.on('end', () => {
        calls += 1;
        if (calls === 1) {
          response.writeHead(503).end();
        } else {
          response
            .writeHead(200, { 'content-type': 'application/json' })
            .end(JSON.stringify({ data: { rows: [] } }));
        }
      });
    });
    await expect(
      client.queryLogs({
        businessId: '11111111-1111-4111-8111-111111111111',
        from: new Date(Date.now() - 60_000),
        to: new Date(),
        filters: [],
      }),
    ).resolves.toMatchObject({ rows: [] });
    expect(calls).toBe(2);

    server.removeAllListeners('request');
    server.on('request', (request, response) => {
      request.resume();
      setTimeout(() => response.writeHead(200).end('{}'), 200);
    });
    const controller = new AbortController();
    const pending = client.queryLogs({
      businessId: '11111111-1111-4111-8111-111111111111',
      from: new Date(Date.now() - 60_000),
      to: new Date(),
      filters: [],
      abortSignal: controller.signal,
    });
    controller.abort();
    const error = await captureError(pending);
    expect(error).toBeInstanceOf(HttpException);
    expect((error as HttpException).getResponse()).toMatchObject({
      code: 'SIGNOZ_QUERY_CANCELLED',
    });
  });
});
