import { BadGatewayException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import type { Workflow } from '../entities';
import {
  METRIC_ACTIVE_WORKFLOWS,
  METRIC_VIOLATIONS_TOTAL,
  METRIC_WORKFLOW_COMPLETION_DURATION,
  METRIC_WORKFLOWS_COMPLETED_TOTAL,
  METRIC_WORKFLOWS_OVERDUE_TOTAL,
  METRIC_WORKFLOWS_STARTED_TOTAL,
} from '../../telemetry/constants/telemetry.constants';

const queryResponseSchema = z
  .object({
    data: z.unknown().optional(),
  })
  .passthrough();

type Signal = 'traces' | 'logs' | 'metrics';
type QueryRecord = Record<string, unknown>;

export type SigNozPreview = {
  configured: boolean;
  signal: Signal;
  start: string;
  end: string;
  explorerUrl?: string;
  items: QueryRecord[];
  message?: string;
};

@Injectable()
export class SigNozObservabilityService {
  private readonly logger = new Logger(SigNozObservabilityService.name);

  constructor(private readonly configService: ConfigService) {}

  async queryTraces(workflow: Workflow): Promise<SigNozPreview> {
    const range = this.rangeFor(workflow);
    const unavailable = this.unavailable('traces', range);
    if (unavailable) return unavailable;

    const response = await this.query({
      start: range.startMs,
      end: range.endMs,
      requestType: 'raw',
      variables: {},
      compositeQuery: {
        queries: [
          {
            type: 'builder_query',
            spec: {
              name: 'workflow_traces',
              signal: 'traces',
              filter: {
                expression: `workflow.id = '${this.escapeFilterValue(workflow.id)}'`,
              },
              selectFields: [
                { name: 'timestamp' },
                { name: 'trace_id' },
                { name: 'span_id' },
                { name: 'name' },
                { name: 'duration_nano' },
                { name: 'status_code' },
                { name: 'service.name', fieldContext: 'resource' },
                { name: 'workflow.id', fieldContext: 'span' },
                { name: 'rule.id', fieldContext: 'span' },
                { name: 'event.name', fieldContext: 'span' },
              ],
              order: [{ key: { name: 'timestamp' }, direction: 'desc' }],
              limit: 100,
              offset: 0,
              disabled: false,
            },
          },
        ],
      },
    });

    return this.preview('traces', range, response, workflow);
  }

  async queryLogs(workflow: Workflow): Promise<SigNozPreview> {
    const range = this.rangeFor(workflow);
    const unavailable = this.unavailable('logs', range);
    if (unavailable) return unavailable;

    const response = await this.query({
      start: range.startMs,
      end: range.endMs,
      requestType: 'raw',
      variables: {},
      compositeQuery: {
        queries: [
          {
            type: 'builder_query',
            spec: {
              name: 'workflow_logs',
              signal: 'logs',
              filter: {
                expression: `workflow.id = '${this.escapeFilterValue(workflow.id)}'`,
              },
              order: [
                { key: { name: 'timestamp' }, direction: 'desc' },
                { key: { name: 'id' }, direction: 'desc' },
              ],
              limit: 100,
              offset: 0,
              disabled: false,
            },
          },
        ],
      },
    });

    return this.preview('logs', range, response, workflow);
  }

  async queryMetrics(workflow: Workflow): Promise<SigNozPreview> {
    const range = this.rangeFor(workflow);
    const unavailable = this.unavailable('metrics', range);
    if (unavailable) return unavailable;

    const filter = {
      expression: `workflow.id = '${this.escapeFilterValue(workflow.id)}'`,
    };
    const counterQueries = [
      METRIC_WORKFLOWS_STARTED_TOTAL,
      METRIC_WORKFLOWS_COMPLETED_TOTAL,
      METRIC_WORKFLOWS_OVERDUE_TOTAL,
      METRIC_VIOLATIONS_TOTAL,
    ].map((metricName) => ({
      type: 'builder_query',
      spec: {
        name: metricName,
        signal: 'metrics',
        stepInterval: this.stepInterval(range.startMs, range.endMs),
        aggregations: [
          {
            metricName,
            temporality: 'Unspecified',
            timeAggregation: 'sum',
            spaceAggregation: 'sum',
          },
        ],
        filter,
        disabled: false,
      },
    }));
    const response = await this.query({
      start: range.startMs,
      end: range.endMs,
      requestType: 'time_series',
      variables: {},
      compositeQuery: {
        queries: [
          ...counterQueries,
          {
            type: 'builder_query',
            spec: {
              name: METRIC_ACTIVE_WORKFLOWS,
              signal: 'metrics',
              stepInterval: this.stepInterval(range.startMs, range.endMs),
              aggregations: [
                {
                  metricName: METRIC_ACTIVE_WORKFLOWS,
                  temporality: 'Unspecified',
                  timeAggregation: 'avg',
                  spaceAggregation: 'sum',
                },
              ],
              filter,
              disabled: false,
            },
          },
          {
            type: 'builder_query',
            spec: {
              name: METRIC_WORKFLOW_COMPLETION_DURATION,
              signal: 'metrics',
              stepInterval: this.stepInterval(range.startMs, range.endMs),
              aggregations: [
                {
                  metricName: METRIC_WORKFLOW_COMPLETION_DURATION,
                  temporality: 'Unspecified',
                  timeAggregation: 'avg',
                  spaceAggregation: 'p95',
                },
              ],
              filter,
              disabled: false,
            },
          },
        ],
      },
    });

    return this.preview('metrics', range, response, workflow);
  }

  private async query(body: QueryRecord): Promise<unknown> {
    const apiUrl = this.configService.get<string>('signoz.apiUrl');
    const apiKey = this.configService.get<string>('signoz.apiKey');
    const timeoutMs =
      this.configService.get<number>('signoz.queryTimeoutMs') ?? 10_000;
    if (!apiUrl || !apiKey) return null;

    try {
      const response = await fetch(`${apiUrl}/api/v5/query_range`, {
        method: 'POST',
        headers: {
          accept: 'application/json',
          'content-type': 'application/json',
          'SIGNOZ-API-KEY': apiKey,
        },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!response.ok) {
        const responseText = await response.text();
        this.logger.warn(
          `SigNoz query failed with status ${response.status}: ${responseText.slice(0, 300)}`,
        );
        if (response.status === 403) {
          throw new BadGatewayException(
            'SigNoz service account lacks read access. Assign the signoz-viewer role.',
          );
        }
        throw new BadGatewayException(
          `SigNoz query failed (${response.status})`,
        );
      }
      return queryResponseSchema.parse(await response.json());
    } catch (error: unknown) {
      if (error instanceof BadGatewayException) throw error;
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`SigNoz query failed: ${message}`);
      throw new BadGatewayException('Unable to query SigNoz');
    }
  }

  private preview(
    signal: Signal,
    range: ReturnType<SigNozObservabilityService['rangeFor']>,
    response: unknown,
    workflow: Workflow,
  ): SigNozPreview {
    return {
      configured: true,
      signal,
      start: new Date(range.startMs).toISOString(),
      end: new Date(range.endMs).toISOString(),
      explorerUrl: this.explorerUrl(signal, workflow),
      items: this.extractItems(response),
    };
  }

  private unavailable(
    signal: Signal,
    range: ReturnType<SigNozObservabilityService['rangeFor']>,
  ): SigNozPreview | null {
    const apiUrl = this.configService.get<string>('signoz.apiUrl');
    const apiKey = this.configService.get<string>('signoz.apiKey');
    if (apiUrl && apiKey) return null;
    return {
      configured: false,
      signal,
      start: new Date(range.startMs).toISOString(),
      end: new Date(range.endMs).toISOString(),
      explorerUrl: this.explorerUrl(signal),
      items: [],
      message:
        'Set SIGNOZ_API_URL and SIGNOZ_API_KEY on the API server to enable live SigNoz queries.',
    };
  }

  private rangeFor(workflow: Workflow) {
    const eventTimes =
      workflow.externalWorkflow?.eventLogs?.map((log) =>
        new Date(log.timestamp).getTime(),
      ) ?? [];
    const knownTimes = [
      new Date(workflow.createdAt).getTime(),
      new Date(workflow.updatedAt).getTime(),
      ...eventTimes,
    ].filter(Number.isFinite);
    const fiveMinutes = 5 * 60 * 1000;
    return {
      startMs: Math.min(...knownTimes) - fiveMinutes,
      endMs: Math.max(Date.now(), ...knownTimes) + fiveMinutes,
    };
  }

  private stepInterval(startMs: number, endMs: number): number {
    return Math.max(15, Math.ceil((endMs - startMs) / 1000 / 120));
  }

  private explorerUrl(signal: Signal, workflow?: Workflow): string | undefined {
    const baseUrl = this.configService.get<string>('signoz.uiUrl');
    if (!baseUrl) return undefined;
    if (signal === 'traces') {
      const traceId = workflow?.externalWorkflow?.eventLogs?.find(
        (eventLog) => eventLog.traceId,
      )?.traceId;
      return traceId
        ? `${baseUrl}/trace/${encodeURIComponent(traceId)}`
        : `${baseUrl}/traces-explorer`;
    }
    if (signal === 'logs') return `${baseUrl}/logs-explorer`;
    return `${baseUrl}/metrics-explorer`;
  }

  private extractItems(value: unknown): QueryRecord[] {
    const parsed = queryResponseSchema.safeParse(value);
    if (!parsed.success || parsed.data.data === undefined) return [];
    const preferred: QueryRecord[] = [];
    this.collectPreferredItems(parsed.data.data, preferred);
    if (preferred.length > 0) return preferred;
    return this.asRecordArray(parsed.data.data);
  }

  private collectPreferredItems(value: unknown, target: QueryRecord[]): void {
    if (Array.isArray(value)) {
      value.forEach((item) => this.collectPreferredItems(item, target));
      return;
    }
    if (!this.isRecord(value)) return;
    for (const [key, nested] of Object.entries(value)) {
      if (['rows', 'series', 'list'].includes(key) && Array.isArray(nested)) {
        nested.forEach((item) => {
          if (!this.isRecord(item)) return;
          target.push(this.isRecord(item.data) ? item.data : item);
        });
      } else {
        this.collectPreferredItems(nested, target);
      }
    }
  }

  private asRecordArray(value: unknown): QueryRecord[] {
    if (Array.isArray(value)) {
      return value.filter(this.isRecord);
    }
    if (!this.isRecord(value)) return [];
    const result = value.result;
    if (Array.isArray(result)) return result.filter(this.isRecord);
    return [value];
  }

  private readonly isRecord = (value: unknown): value is QueryRecord =>
    typeof value === 'object' && value !== null && !Array.isArray(value);

  private escapeFilterValue(value: string): string {
    return value.replaceAll('\\', '\\\\').replaceAll("'", "\\'");
  }
}
