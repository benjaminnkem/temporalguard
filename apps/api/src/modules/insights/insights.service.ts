import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import { Queue } from 'bullmq';
import { createHash } from 'node:crypto';
import { Between, Repository } from 'typeorm';
import { EventLog } from '../events/entities';
import {
  DeploymentObservation,
  Investigation,
  ProcessingStatus,
  RuleSimulation,
  SigNozConnection,
  SigNozQueryAudit,
  TelemetryQualitySnapshot,
  WorkflowComparison,
} from '../processing/entities';
import {
  PROCESSING_DEAD_LETTER_QUEUE,
  PROCESSING_QUEUE,
} from '../processing/constants/processing.constants';
import { Workflow } from '../workflows/entities';
import { WorkflowStatus } from '../workflows/enums';
import {
  ComparisonKind,
  CreateComparisonDto,
} from './dto/create-comparison.dto';
import { CreateSimulationDto } from './dto/create-simulation.dto';

@Injectable()
export class InsightsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflows: Repository<Workflow>,
    @InjectRepository(EventLog) private readonly events: Repository<EventLog>,
    @InjectRepository(WorkflowComparison)
    private readonly comparisons: Repository<WorkflowComparison>,
    @InjectRepository(RuleSimulation)
    private readonly simulations: Repository<RuleSimulation>,
    @InjectRepository(DeploymentObservation)
    private readonly deployments: Repository<DeploymentObservation>,
    @InjectRepository(TelemetryQualitySnapshot)
    private readonly quality: Repository<TelemetryQualitySnapshot>,
    @InjectRepository(Investigation)
    private readonly investigations: Repository<Investigation>,
    @InjectRepository(SigNozConnection)
    private readonly connections: Repository<SigNozConnection>,
    @InjectRepository(SigNozQueryAudit)
    private readonly signozAudits: Repository<SigNozQueryAudit>,
    @InjectQueue(PROCESSING_QUEUE) private readonly queue: Queue,
    @InjectQueue(PROCESSING_DEAD_LETTER_QUEUE)
    private readonly deadLetterQueue: Queue,
  ) {}

  listComparisons(businessId: string) {
    return this.comparisons.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async getComparison(businessId: string, id: string) {
    const value = await this.comparisons.findOneBy({ businessId, id });
    if (!value) throw new NotFoundException('Comparison not found');
    return value;
  }

  async createComparison(
    businessId: string,
    requestedBy: string,
    input: CreateComparisonDto,
  ) {
    const to = input.to ? new Date(input.to) : new Date();
    const from = input.from
      ? new Date(input.from)
      : new Date(to.getTime() - 7 * 86_400_000);
    if (to <= from || to.getTime() - from.getTime() > 90 * 86_400_000) {
      throw new BadRequestException('Comparison range must be within 90 days');
    }
    const workflows = await this.workflows.find({
      where: { businessId, createdAt: Between(from, to) },
      relations: { violations: true },
      order: { createdAt: 'ASC' },
    });
    const result = this.compare(workflows, input);
    const configuration = {
      kind: input.kind,
      from: from.toISOString(),
      to: to.toISOString(),
      deploymentVersion: input.deploymentVersion ?? null,
    };
    const configurationHash = createHash('sha256')
      .update(JSON.stringify(configuration))
      .digest('hex');
    const existing = await this.comparisons.findOneBy({
      businessId,
      configurationHash,
    });
    if (existing) return existing;
    return this.comparisons.save(
      this.comparisons.create({
        businessId,
        requestedBy,
        name: input.name ?? input.kind.replaceAll('_', ' '),
        configuration,
        configurationHash,
        status: ProcessingStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        cohortASize: result.cohortA.count,
        cohortBSize: result.cohortB.count,
        resultSummary: result,
      }),
    );
  }

  listSimulations(businessId: string) {
    return this.simulations.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async createSimulation(
    businessId: string,
    requestedBy: string,
    input: CreateSimulationDto,
  ) {
    const from = new Date(input.from);
    const to = new Date(input.to);
    if (to <= from || to.getTime() - from.getTime() > 90 * 86_400_000) {
      throw new BadRequestException('Simulation range must be within 90 days');
    }
    const workflows = await this.workflows.find({
      where: { businessId, createdAt: Between(from, to) },
      relations: { violations: true },
    });
    const scoped = input.ruleId
      ? workflows.filter((workflow) => workflow.ruleId === input.ruleId)
      : workflows;
    const wouldComplete = scoped.filter(
      (workflow) =>
        workflow.status === WorkflowStatus.COMPLETED &&
        workflow.updatedAt <= workflow.deadline,
    ).length;
    const wouldCompleteLate = scoped.filter(
      (workflow) =>
        workflow.status === WorkflowStatus.COMPLETED &&
        workflow.updatedAt > workflow.deadline,
    ).length;
    const wouldViolate = scoped.filter(
      (workflow) =>
        workflow.status === WorkflowStatus.OVERDUE ||
        workflow.violations.length > 0,
    ).length;
    const draftHash = createHash('sha256')
      .update(JSON.stringify(input.draft))
      .digest('hex');
    const existing = await this.simulations.findOneBy({
      businessId,
      draftHash,
      from,
      to,
    });
    if (existing) return existing;
    return this.simulations.save(
      this.simulations.create({
        businessId,
        requestedBy,
        ruleId: input.ruleId ?? null,
        draftSnapshot: input.draft,
        draftHash,
        from,
        to,
        status: ProcessingStatus.COMPLETED,
        startedAt: new Date(),
        completedAt: new Date(),
        workflowsEvaluated: scoped.length,
        wouldComplete,
        wouldCompleteLate,
        wouldViolate,
        result: {
          completionRate: scoped.length ? wouldComplete / scoped.length : 0,
          violationRate: scoped.length ? wouldViolate / scoped.length : 0,
          note: 'Historical replay evaluates persisted workflow outcomes; it does not mutate rules or workflows.',
        },
      }),
    );
  }

  listDeployments(businessId: string) {
    return this.deployments.find({
      where: { businessId },
      order: { lastObservedAt: 'DESC' },
      take: 200,
    });
  }

  listQuality(businessId: string) {
    return this.quality.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: 200,
    });
  }

  async platformHealth(businessId: string) {
    const [
      waiting,
      failedInvestigations,
      investigations,
      eventCount,
      failedQueries,
      connections,
      queueCounts,
      deadLetterCounts,
      latestQuality,
    ] = await Promise.all([
      this.workflows.countBy({ businessId, status: WorkflowStatus.WAITING }),
      this.investigations.countBy({
        businessId,
        status: ProcessingStatus.DEAD_LETTER,
      }),
      this.investigations.countBy({ businessId }),
      this.events.countBy({ businessId }),
      this.signozAudits.countBy({ businessId, outcome: 'failed' }),
      this.connections.findBy({ businessId }),
      this.queue.getJobCounts('waiting', 'active', 'delayed', 'failed'),
      this.deadLetterQueue.getJobCounts('waiting', 'failed'),
      this.quality.findOne({
        where: { businessId },
        order: { createdAt: 'DESC' },
      }),
    ]);
    const backlog =
      queueCounts.waiting + queueCounts.active + queueCounts.delayed;
    return {
      status:
        failedInvestigations > 0 || backlog > 100
          ? 'critical'
          : failedQueries > 0 || backlog > 20
            ? 'degraded'
            : 'healthy',
      generatedAt: new Date().toISOString(),
      metrics: {
        workflowsWaiting: waiting,
        eventIngestionTotal: eventCount,
        queueBacklog: backlog,
        queueFailed: queueCounts.failed,
        deadLetters: deadLetterCounts.waiting + deadLetterCounts.failed,
        investigations,
        investigationFailures: failedInvestigations,
        signozQueryFailures: failedQueries,
        telemetryQualityScore: latestQuality?.score ?? null,
      },
      connections: connections.map((connection) => ({
        id: connection.id,
        name: connection.name,
        mode: connection.mode,
        status: connection.status,
        lastValidatedAt: connection.lastValidatedAt,
        errorCode: connection.lastValidationErrorCode,
      })),
    };
  }

  assets() {
    return {
      managedBy: 'terraform',
      dashboards: [
        'Platform Health',
        'Workflow Reliability',
        'Violation Investigation',
        'Event Ingestion',
        'Investigation Agent',
        'Telemetry Completeness',
        'Deployment Impact',
      ],
      alerts: [
        'Ingestion errors',
        'Queue backlog',
        'Deadline drift',
        'Violation increase',
        'No completions',
        'SigNoz query failure',
        'Investigation failure',
        'Telemetry quality regression',
      ],
      sourcePath: 'infra/signoz',
      applyRequiresConfirmation: true,
    };
  }

  private compare(workflows: Workflow[], input: CreateComparisonDto) {
    const dimensions = (items: Workflow[]) => {
      const completed = items.filter(
        (workflow) => workflow.status === WorkflowStatus.COMPLETED,
      );
      const durations = completed
        .map(
          (workflow) =>
            workflow.updatedAt.getTime() - workflow.createdAt.getTime(),
        )
        .sort((a, b) => a - b);
      const versions = Object.fromEntries(
        [
          ...new Set(
            items.map((workflow) =>
              String(workflow.metadata?.deploymentVersion ?? 'unknown'),
            ),
          ),
        ]
          .sort()
          .map((version) => [
            version,
            items.filter(
              (workflow) =>
                String(workflow.metadata?.deploymentVersion ?? 'unknown') ===
                version,
            ).length,
          ]),
      );
      return {
        count: items.length,
        completionRate: items.length ? completed.length / items.length : 0,
        violationRate: items.length
          ? items.filter(
              (workflow) =>
                workflow.status === WorkflowStatus.OVERDUE ||
                workflow.violations.length > 0,
            ).length / items.length
          : 0,
        medianDurationMs: durations.length
          ? durations[Math.floor(durations.length / 2)]
          : null,
        versions,
      };
    };
    let cohortA: Workflow[] = [];
    let cohortB: Workflow[] = [];
    if (input.kind === ComparisonKind.SUCCESSFUL_VS_VIOLATED) {
      cohortA = workflows.filter(
        (workflow) =>
          workflow.status === WorkflowStatus.COMPLETED &&
          workflow.violations.length === 0,
      );
      cohortB = workflows.filter(
        (workflow) =>
          workflow.status === WorkflowStatus.OVERDUE ||
          workflow.violations.length > 0,
      );
    } else if (input.kind === ComparisonKind.COMPLETED_VS_LATE) {
      cohortA = workflows.filter(
        (workflow) =>
          workflow.status === WorkflowStatus.COMPLETED &&
          workflow.updatedAt <= workflow.deadline,
      );
      cohortB = workflows.filter(
        (workflow) =>
          workflow.status === WorkflowStatus.COMPLETED &&
          workflow.updatedAt > workflow.deadline,
      );
    } else {
      const deployment = input.deploymentVersion;
      cohortA = workflows.filter(
        (workflow) => workflow.metadata?.deploymentVersion !== deployment,
      );
      cohortB = workflows.filter(
        (workflow) => workflow.metadata?.deploymentVersion === deployment,
      );
    }
    return {
      kind: input.kind,
      cohortA: dimensions(cohortA),
      cohortB: dimensions(cohortB),
      telemetryQualityDimension: {
        available: workflows.filter(
          (workflow) => workflow.metadata?.telemetryQualityScore !== undefined,
        ).length,
        total: workflows.length,
      },
    };
  }
}
