import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { SigNozLinkBuilder, SigNozQueryClient } from '../../signoz';
import {
  METRIC_WORKFLOW_COMPLETION_DURATION,
  METRIC_WORKFLOWS_STARTED_TOTAL,
} from '../../telemetry/constants/telemetry.constants';
import type { Workflow } from '../entities';
import { WorkflowStatus } from '../enums';

type Signal = 'traces' | 'logs' | 'metrics';
type QueryRecord = Record<string, unknown>;

export type SigNozPreview = {
  configured: boolean;
  signal: Signal;
  start: string;
  end: string;
  explorerUrl?: string;
  items: QueryRecord[];
  errorCode?: string;
  message?: string;
};

@Injectable()
export class SigNozObservabilityService {
  constructor(
    private readonly client: SigNozQueryClient,
    private readonly links: SigNozLinkBuilder,
  ) {}

  queryTraces(workflow: Workflow): Promise<SigNozPreview> {
    return this.query('traces', workflow);
  }

  queryLogs(workflow: Workflow): Promise<SigNozPreview> {
    return this.query('logs', workflow);
  }

  queryMetrics(workflow: Workflow): Promise<SigNozPreview> {
    return this.query('metrics', workflow);
  }

  private async query(
    signal: Signal,
    workflow: Workflow,
  ): Promise<SigNozPreview> {
    const { from, to } = this.rangeFor(workflow);
    try {
      const base = {
        businessId: workflow.businessId,
        from,
        to,
        filters: [
          {
            field: 'temporalguard.workflow.id' as const,
            operator: 'eq' as const,
            value: workflow.id,
          },
        ],
        limit: 100,
      };
      const result =
        signal === 'traces'
          ? await this.client.queryTraces(base)
          : signal === 'logs'
            ? await this.client.queryLogs(base)
            : await this.client.queryMetrics({
                ...base,
                metric: {
                  name:
                    workflow.status === WorkflowStatus.COMPLETED
                      ? METRIC_WORKFLOW_COMPLETION_DURATION
                      : METRIC_WORKFLOWS_STARTED_TOTAL,
                  timeAggregation: 'sum',
                  spaceAggregation: 'sum',
                },
              });
      return {
        configured: true,
        signal,
        start: result.from,
        end: result.to,
        explorerUrl: this.links.build({
          signal,
          traceId:
            workflow.externalWorkflow?.eventLogs?.find((log) => log.traceId)
              ?.traceId ?? undefined,
          from,
          to,
        }),
        items: result.rows,
      };
    } catch (error: unknown) {
      if (!(error instanceof ServiceUnavailableException)) throw error;
      const response = error.getResponse();
      const errorCode =
        typeof response === 'object' &&
        response !== null &&
        'code' in response &&
        typeof response.code === 'string'
          ? response.code
          : 'SIGNOZ_UNAVAILABLE';
      const notConfigured = errorCode === 'SIGNOZ_NOT_CONFIGURED';
      return {
        configured: !notConfigured,
        signal,
        start: from.toISOString(),
        end: to.toISOString(),
        explorerUrl: this.links.build({ signal, from, to }),
        items: [],
        errorCode,
        message: notConfigured
          ? 'SigNoz query access is not configured.'
          : errorCode === 'SIGNOZ_CIRCUIT_OPEN'
            ? 'SigNoz query access is temporarily paused after repeated failures. Try again shortly.'
            : errorCode === 'REDIS_UNAVAILABLE'
              ? 'The telemetry query rate limiter is temporarily unavailable.'
              : 'SigNoz is temporarily unavailable.',
      };
    }
  }

  private rangeFor(workflow: Workflow): { from: Date; to: Date } {
    const times = [
      new Date(workflow.createdAt).getTime(),
      new Date(workflow.updatedAt).getTime(),
      ...(workflow.externalWorkflow?.eventLogs?.map((log) =>
        new Date(log.timestamp).getTime(),
      ) ?? []),
    ].filter(Number.isFinite);
    const padding = 5 * 60_000;
    return {
      from: new Date(Math.min(...times) - padding),
      to: new Date(Math.min(Date.now(), Math.max(...times) + padding)),
    };
  }
}
