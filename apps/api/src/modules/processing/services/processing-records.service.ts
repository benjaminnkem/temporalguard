import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  AgentRun,
  AgentToolCall,
  DeploymentObservation,
  Evidence,
  Investigation,
  InvestigationStep,
  ProcessingStatus,
  RuleSimulation,
  TelemetryQualitySnapshot,
  WorkflowComparison,
} from '../entities';
import { AuditService } from './audit.service';

@Injectable()
export class ProcessingRecordsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly audit: AuditService,
  ) {}

  appendStep(input: {
    investigationId: string;
    sequence: number;
    type: string;
    name: string;
    status: ProcessingStatus;
    inputRedacted?: Record<string, unknown> | null;
  }): Promise<InvestigationStep> {
    return this.dataSource.transaction(async (manager) => {
      const investigation = await manager
        .getRepository(Investigation)
        .findOneByOrFail({ id: input.investigationId });
      const repository = manager.getRepository(InvestigationStep);
      const step = await repository.save(repository.create(input));
      await this.audit.record(
        {
          businessId: investigation.businessId,
          action: 'investigation.step_recorded',
          entityType: 'investigation_step',
          entityId: step.id,
          metadata: {
            investigationId: input.investigationId,
            sequence: input.sequence,
          },
        },
        manager,
      );
      return step;
    });
  }

  appendEvidence(input: {
    businessId: string;
    investigationId: string;
    type: string;
    signal: string;
    sourceSystem: string;
    queryId?: string | null;
    title: string;
    summary: string;
    timeRangeStart: Date;
    timeRangeEnd: Date;
    serviceName?: string | null;
    serviceVersion?: string | null;
    traceId?: string | null;
    spanId?: string | null;
    measuredValue?: number | null;
    unit?: string | null;
    confidence?: number | null;
    reference?: string | null;
    redactedSnapshot?: Record<string, unknown> | null;
  }): Promise<Evidence> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(Evidence);
      const evidence = await repository.save(repository.create(input));
      await manager
        .getRepository(Investigation)
        .increment(
          { id: input.investigationId, businessId: input.businessId },
          'evidenceCount',
          1,
        );
      await this.audit.record(
        {
          businessId: input.businessId,
          action: 'investigation.evidence_recorded',
          entityType: 'evidence',
          entityId: evidence.id,
          metadata: {
            investigationId: input.investigationId,
            signal: input.signal,
          },
        },
        manager,
      );
      return evidence;
    });
  }

  startAgentRun(input: {
    businessId: string;
    investigationId: string;
    provider: string;
    model: string;
    policyVersion: string;
    maxSteps: number;
  }): Promise<AgentRun> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AgentRun);
      const run = await repository.save(
        repository.create({
          ...input,
          status: ProcessingStatus.RUNNING,
          startedAt: new Date(),
        }),
      );
      await this.audit.record(
        {
          businessId: input.businessId,
          action: 'agent_run.started',
          entityType: 'agent_run',
          entityId: run.id,
          metadata: { investigationId: input.investigationId },
        },
        manager,
      );
      return run;
    });
  }

  recordToolCall(input: {
    businessId: string;
    agentRunId: string;
    sequence: number;
    toolName: string;
    inputRedacted?: Record<string, unknown> | null;
    outputEvidenceIds?: string[];
    status: ProcessingStatus;
    durationMs?: number | null;
    errorCode?: string | null;
  }): Promise<AgentToolCall> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(AgentToolCall);
      const call = await repository.save(
        repository.create({
          ...input,
          outputEvidenceIds: input.outputEvidenceIds ?? [],
        }),
      );
      await this.audit.record(
        {
          businessId: input.businessId,
          action: 'agent_tool_call.recorded',
          entityType: 'agent_tool_call',
          entityId: call.id,
          metadata: { agentRunId: input.agentRunId, toolName: input.toolName },
        },
        manager,
      );
      return call;
    });
  }

  createComparison(input: {
    businessId: string;
    requestedBy: string;
    name: string;
    configurationHash: string;
    configuration: Record<string, unknown>;
  }): Promise<WorkflowComparison> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(WorkflowComparison);
      const comparison = await repository.save(
        repository.create({ ...input, status: ProcessingStatus.PENDING }),
      );
      await this.audit.record(
        {
          businessId: input.businessId,
          actorId: input.requestedBy,
          action: 'comparison.created',
          entityType: 'comparison',
          entityId: comparison.id,
        },
        manager,
      );
      return comparison;
    });
  }

  createSimulation(input: {
    businessId: string;
    requestedBy: string;
    ruleId?: string | null;
    draftSnapshot: Record<string, unknown>;
    draftHash: string;
    from: Date;
    to: Date;
  }): Promise<RuleSimulation> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(RuleSimulation);
      const simulation = await repository.save(
        repository.create({
          ...input,
          ruleId: input.ruleId ?? null,
          status: ProcessingStatus.PENDING,
        }),
      );
      await this.audit.record(
        {
          businessId: input.businessId,
          actorId: input.requestedBy,
          action: 'simulation.created',
          entityType: 'simulation',
          entityId: simulation.id,
        },
        manager,
      );
      return simulation;
    });
  }

  observeDeployment(input: {
    businessId: string;
    serviceName: string;
    environment: string;
    version: string;
    observedAt: Date;
    source: string;
  }): Promise<DeploymentObservation> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(DeploymentObservation);
      const existing = await repository.findOneBy({
        businessId: input.businessId,
        serviceName: input.serviceName,
        environment: input.environment,
        version: input.version,
      });
      const observation = await repository.save(
        repository.create({
          ...existing,
          ...input,
          firstObservedAt: existing?.firstObservedAt ?? input.observedAt,
          lastObservedAt: input.observedAt,
        }),
      );
      await this.audit.record(
        {
          businessId: input.businessId,
          action: existing ? 'deployment.observed' : 'deployment.discovered',
          entityType: 'deployment_observation',
          entityId: observation.id,
          metadata: {
            serviceName: input.serviceName,
            environment: input.environment,
            version: input.version,
          },
        },
        manager,
      );
      return observation;
    });
  }

  recordQualitySnapshot(input: {
    businessId: string;
    scopeType: string;
    scopeKey: string;
    from: Date;
    to: Date;
    score: number;
    dimensions: Record<string, unknown>;
    criticalGaps: unknown[];
  }): Promise<TelemetryQualitySnapshot> {
    return this.dataSource.transaction(async (manager) => {
      const repository = manager.getRepository(TelemetryQualitySnapshot);
      const snapshot = await repository.save(repository.create(input));
      await this.audit.record(
        {
          businessId: input.businessId,
          action: 'telemetry_quality.recorded',
          entityType: 'telemetry_quality_snapshot',
          entityId: snapshot.id,
          metadata: { scopeType: input.scopeType, scopeKey: input.scopeKey },
        },
        manager,
      );
      return snapshot;
    });
  }
}
