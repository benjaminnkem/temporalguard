import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'node:crypto';
import { UnrecoverableError } from 'bullmq';
import { LessThan, MoreThanOrEqual, Repository } from 'typeorm';
import { Rule } from '../rules/entities';
import { SigNozLinkBuilder, SigNozQueryClient } from '../signoz';
import { Violation } from '../violations/entities';
import { Workflow } from '../workflows/entities';
import {
  AgentRun,
  Evidence,
  Investigation,
  ProcessingStatus,
  TelemetryQualitySnapshot,
  WorkflowComparison,
} from '../processing/entities';
import { ProcessingRecordsService } from '../processing/services/processing-records.service';
import { TelemetryService } from '../telemetry/services/telemetry.service';
import { BoundedToolRegistry } from './bounded-tool-registry';
import { InvestigationProvider } from './investigation-provider.service';
import {
  InvestigationReport,
  neutralizeTelemetryPromptInjection,
  removeUnsupportedClaims,
} from './investigation-report';
import { InvestigationStreamService } from './investigation-stream.service';

@Injectable()
export class InvestigationEngine {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Investigation)
    private readonly investigations: Repository<Investigation>,
    @InjectRepository(Violation)
    private readonly violations: Repository<Violation>,
    @InjectRepository(Workflow)
    private readonly workflows: Repository<Workflow>,
    @InjectRepository(Rule)
    private readonly rules: Repository<Rule>,
    @InjectRepository(Evidence)
    private readonly evidenceRepository: Repository<Evidence>,
    @InjectRepository(AgentRun)
    private readonly runs: Repository<AgentRun>,
    @InjectRepository(TelemetryQualitySnapshot)
    private readonly quality: Repository<TelemetryQualitySnapshot>,
    @InjectRepository(WorkflowComparison)
    private readonly comparisons: Repository<WorkflowComparison>,
    private readonly signoz: SigNozQueryClient,
    private readonly links: SigNozLinkBuilder,
    private readonly records: ProcessingRecordsService,
    private readonly provider: InvestigationProvider,
    private readonly stream: InvestigationStreamService,
    private readonly telemetry: TelemetryService,
  ) {}

  async execute(
    businessId: string,
    investigationId: string,
    signal?: AbortSignal,
  ): Promise<InvestigationReport> {
    return this.telemetry.trace(
      'temporalguard.investigation.execute',
      {
        'temporalguard.company.id_hash': createHash('sha256')
          .update(businessId)
          .digest('hex'),
        'temporalguard.investigation.id': investigationId,
      },
      async () => {
        const investigation = await this.investigations.findOneByOrFail({
          id: investigationId,
          businessId,
        });
        const violation = await this.violations.findOneByOrFail({
          id: investigation.violationId,
          businessId,
        });
        const workflow = await this.workflows.findOneByOrFail({
          id: investigation.workflowId,
          businessId,
        });
        const rule = await this.rules.findOneByOrFail({
          id: investigation.ruleId,
          businessId,
        });
        const maxSteps = this.config.get<number>('agent.maxSteps') ?? 8;
        const run = await this.records.startAgentRun({
          businessId,
          investigationId,
          provider: this.config.get<string>('agent.provider') ?? 'disabled',
          model: this.config.get<string>('agent.model') ?? 'deterministic',
          policyVersion: 'investigation-v1',
          maxSteps,
        });
        await this.stream.append(businessId, investigationId, 'started', {
          status: ProcessingStatus.RUNNING,
        });
        const from = new Date(
          Math.min(
            violation.occurredAt.getTime() - 30 * 60_000,
            workflow.createdAt.getTime(),
          ),
        );
        const to = new Date(
          Math.min(Date.now(), violation.occurredAt.getTime() + 30 * 60_000),
        );
        const registry = new BoundedToolRegistry(maxSteps);
        const collected: Evidence[] = [];
        const gaps: string[] = [];
        registry.register({
          name: 'workflow_context',
          execute: () =>
            Promise.resolve({
              violation: {
                id: violation.id,
                severity: violation.severity,
                reason: violation.reason,
                occurredAt: violation.occurredAt,
              },
              workflow: {
                id: workflow.id,
                name: workflow.name,
                status: workflow.status,
                deadline: workflow.deadline,
              },
              rule: { id: rule.id, name: rule.name },
            }),
        });
        registry.register({
          name: 'cohort_comparison',
          execute: async () => {
            const split = violation.occurredAt;
            const cohortA = await this.workflows.countBy({
              businessId,
              ruleId: rule.id,
              createdAt: MoreThanOrEqual(
                new Date(split.getTime() - 24 * 60 * 60_000),
              ),
              updatedAt: LessThan(split),
            });
            const cohortB = await this.workflows.countBy({
              businessId,
              ruleId: rule.id,
              createdAt: MoreThanOrEqual(split),
            });
            const configuration = {
              ruleId: rule.id,
              split: split.toISOString(),
              windowHours: 24,
            };
            const configurationHash = createHash('sha256')
              .update(`${investigationId}:cohort-v1`)
              .digest('hex');
            const comparison =
              (await this.comparisons.findOneBy({
                businessId,
                configurationHash,
              })) ??
              (await this.records.createComparison({
                businessId,
                requestedBy: investigation.requestedBy,
                name: `Investigation ${investigationId} cohort`,
                configurationHash,
                configuration,
              }));
            await this.comparisons.update(
              { id: comparison.id, businessId },
              {
                status: ProcessingStatus.COMPLETED,
                cohortASize: cohortA,
                cohortBSize: cohortB,
                completedAt: new Date(),
                resultSummary: { cohortA, cohortB },
              },
            );
            return { cohortA, cohortB, comparisonId: comparison.id };
          },
        });
        for (const signalName of ['traces', 'logs', 'metrics'] as const) {
          registry.register({
            name: `signoz_${signalName}`,
            execute: async (abortSignal) => {
              const base = {
                businessId,
                investigationId,
                from,
                to,
                filters: [
                  {
                    field: 'temporalguard.workflow.id' as const,
                    operator: 'eq' as const,
                    value: workflow.id,
                  },
                ],
                limit: signalName === 'logs' ? 100 : 50,
                abortSignal,
              };
              return signalName === 'traces'
                ? this.signoz.queryTraces(base)
                : signalName === 'logs'
                  ? this.signoz.queryLogs(base)
                  : this.signoz.queryMetrics({
                      ...base,
                      metric: {
                        name: 'temporalguard.workflow.duration',
                        timeAggregation: 'avg',
                        spaceAggregation: 'p95',
                      },
                    });
            },
          });
        }
        await this.callTool(
          registry,
          run,
          businessId,
          'workflow_context',
          0,
          signal,
          () => Promise.resolve([]),
        );
        const cohortEvidence = (await this.callTool(
          registry,
          run,
          businessId,
          'cohort_comparison',
          1,
          signal,
          async (value) => [
            await this.records.appendEvidence({
              businessId,
              investigationId,
              type: 'comparison',
              signal: 'database',
              sourceSystem: 'temporalguard',
              title: 'Workflow cohort comparison',
              summary: JSON.stringify(value).slice(0, 1000),
              timeRangeStart: from,
              timeRangeEnd: to,
              confidence: 1,
              redactedSnapshot: value as Record<string, unknown>,
            }),
          ],
        )) as Evidence[];
        collected.push(...cohortEvidence);
        for (const signalName of ['traces', 'logs', 'metrics'] as const) {
          if (signal?.aborted) throw new UnrecoverableError('JOB_CANCELLED');
          try {
            const result = (await this.callTool(
              registry,
              run,
              businessId,
              `signoz_${signalName}`,
              { traces: 2, logs: 3, metrics: 4 }[signalName],
              signal,
              async (value) => {
                const query = value as {
                  queryId: string;
                  rows: Array<Record<string, unknown>>;
                };
                const output: Evidence[] = [];
                for (const [index, row] of query.rows.slice(0, 20).entries()) {
                  const evidence = await this.records.appendEvidence({
                    businessId,
                    investigationId,
                    type: 'telemetry',
                    signal: signalName,
                    sourceSystem: 'signoz',
                    queryId: query.queryId,
                    title: `${signalName} evidence ${index + 1}`,
                    summary: this.safeSummary(row),
                    timeRangeStart: from,
                    timeRangeEnd: to,
                    serviceName: this.stringValue(row['service.name']),
                    serviceVersion: this.stringValue(row['service.version']),
                    traceId: this.stringValue(row.trace_id),
                    spanId: this.stringValue(row.span_id),
                    reference: this.links.build({
                      signal: signalName,
                      traceId: this.stringValue(row.trace_id) ?? undefined,
                      from,
                      to,
                    }),
                    redactedSnapshot: row,
                    confidence: 0.8,
                  });
                  if (evidence.serviceName && evidence.serviceVersion) {
                    await this.records.observeDeployment({
                      businessId,
                      serviceName: evidence.serviceName,
                      environment:
                        this.stringValue(
                          row['deployment.environment.name'] ??
                            row['deployment.environment'],
                        ) ?? 'unknown',
                      version: evidence.serviceVersion,
                      observedAt: to,
                      source: 'signoz',
                    });
                  }
                  output.push(evidence);
                }
                return output;
              },
            )) as Evidence[];
            collected.push(...result);
          } catch {
            gaps.push(`${signalName} unavailable`);
          }
        }
        if (signal?.aborted) throw new UnrecoverableError('JOB_CANCELLED');
        const completeness = this.completeness(collected, gaps);
        await this.quality.save(
          this.quality.create({
            businessId,
            scopeType: 'investigation',
            scopeKey: investigationId,
            from,
            to,
            score: completeness.score,
            dimensions: completeness.dimensions,
            criticalGaps: completeness.gaps,
          }),
        );
        const contributors = this.rankContributors(collected);
        const deterministic: InvestigationReport = {
          schemaVersion: '1.0',
          summary:
            contributors.length > 0
              ? `Evidence most strongly points to ${contributors[0].name}.`
              : 'No supported contributor could be established from available telemetry.',
          confidence:
            completeness.score >= 0.8 && contributors.length
              ? 'high'
              : completeness.score >= 0.5
                ? 'medium'
                : 'low',
          telemetryCompleteness: {
            score: completeness.score,
            gaps: completeness.gaps,
          },
          contributors,
          claims: contributors.slice(0, 3).map((entry) => ({
            text: `${entry.name} is a ranked contributor based on collected telemetry.`,
            evidenceIds: entry.evidenceIds,
          })),
          noRemediationPerformed: true,
        };
        let candidate = deterministic;
        try {
          candidate = await this.provider.synthesize(
            {
              deterministic,
              evidence: collected.map(({ id, title, summary }) => ({
                id,
                title,
                summary,
              })),
            },
            signal,
          );
        } catch {
          gaps.push('AI synthesis unavailable; deterministic report used');
        }
        const report = removeUnsupportedClaims(
          {
            ...candidate,
            telemetryCompleteness: {
              score: completeness.score,
              gaps: [...new Set(gaps)],
            },
          },
          new Set(collected.map((item) => item.id)),
        );
        await this.investigations.update(
          { id: investigationId, businessId },
          {
            report,
            summary: report.summary,
            confidence: report.confidence,
            topContributor: report.contributors[0]?.name ?? null,
            dataGapCount: report.telemetryCompleteness.gaps.length,
            status:
              report.telemetryCompleteness.gaps.length > 0
                ? ProcessingStatus.COMPLETED_WITH_GAPS
                : ProcessingStatus.COMPLETED,
            completedAt: new Date(),
          },
        );
        await this.runs.update(
          { id: run.id },
          { status: ProcessingStatus.COMPLETED, completedAt: new Date() },
        );
        await this.stream.append(businessId, investigationId, 'completed', {
          status:
            report.telemetryCompleteness.gaps.length > 0
              ? ProcessingStatus.COMPLETED_WITH_GAPS
              : ProcessingStatus.COMPLETED,
          report,
        });
        this.telemetry.investigationFinished(
          report.telemetryCompleteness.gaps.length > 0
            ? ProcessingStatus.COMPLETED_WITH_GAPS
            : ProcessingStatus.COMPLETED,
          report.telemetryCompleteness.score,
          report.telemetryCompleteness.gaps.length,
          businessId,
        );
        return report;
      },
    );
  }

  private async callTool(
    registry: BoundedToolRegistry,
    run: AgentRun,
    businessId: string,
    name: string,
    sequence: number,
    signal: AbortSignal | undefined,
    persist: (value: unknown) => Promise<Evidence[]>,
  ): Promise<unknown> {
    const started = Date.now();
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal?.addEventListener('abort', abort, { once: true });
    try {
      const value = await registry.call(name, controller.signal);
      const evidence = await persist(value);
      await this.records.recordToolCall({
        businessId,
        agentRunId: run.id,
        sequence,
        toolName: name,
        outputEvidenceIds: evidence.map((item) => item.id),
        status: ProcessingStatus.COMPLETED,
        durationMs: Date.now() - started,
      });
      this.telemetry.investigationToolCall(
        name,
        ProcessingStatus.COMPLETED,
        businessId,
      );
      await this.stream.append(
        businessId,
        run.investigationId,
        'tool_completed',
        { tool: name, evidenceIds: evidence.map((item) => item.id) },
      );
      return evidence.length ? evidence : value;
    } catch (error: unknown) {
      await this.records.recordToolCall({
        businessId,
        agentRunId: run.id,
        sequence,
        toolName: name,
        status: ProcessingStatus.FAILED,
        durationMs: Date.now() - started,
        errorCode:
          error instanceof Error ? error.message.slice(0, 120) : 'UNKNOWN',
      });
      this.telemetry.investigationToolCall(
        name,
        ProcessingStatus.FAILED,
        businessId,
      );
      await this.stream.append(businessId, run.investigationId, 'tool_failed', {
        tool: name,
      });
      throw error;
    } finally {
      signal?.removeEventListener('abort', abort);
    }
  }

  private safeSummary(row: Record<string, unknown>): string {
    return neutralizeTelemetryPromptInjection(JSON.stringify(row)).slice(
      0,
      1000,
    );
  }

  private stringValue(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0
      ? value.slice(0, 255)
      : null;
  }

  private completeness(evidence: Evidence[], initialGaps: string[]) {
    const signals = new Set(evidence.map((item) => item.signal));
    const dimensions = {
      traces: signals.has('traces'),
      logs: signals.has('logs'),
      metrics: signals.has('metrics'),
      traceCorrelation: evidence.some((item) => item.traceId),
      serviceVersion: evidence.some((item) => item.serviceVersion),
    };
    const gaps = [...initialGaps];
    for (const [name, present] of Object.entries(dimensions)) {
      if (!present) gaps.push(`missing ${name}`);
    }
    const score =
      Object.values(dimensions).filter(Boolean).length /
      Object.values(dimensions).length;
    return { score, dimensions, gaps: [...new Set(gaps)] };
  }

  private rankContributors(evidence: Evidence[]) {
    const grouped = new Map<string, Evidence[]>();
    for (const item of evidence) {
      const key = item.serviceName ?? item.signal;
      grouped.set(key, [...(grouped.get(key) ?? []), item]);
    }
    const max = Math.max(
      1,
      ...[...grouped.values()].map((items) => items.length),
    );
    return [...grouped.entries()]
      .map(([name, items]) => ({
        rank: 0,
        name,
        score: Number((items.length / max).toFixed(4)),
        evidenceIds: items
          .map((item) => item.id)
          .sort()
          .slice(0, 20),
      }))
      .sort(
        (a, b) =>
          b.score - a.score ||
          a.name.localeCompare(b.name) ||
          a.evidenceIds.join().localeCompare(b.evidenceIds.join()),
      )
      .map((entry, index) => ({ ...entry, rank: index + 1 }))
      .slice(0, 10);
  }
}
