import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  Unique,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Business } from '../../businesses/entities';

export enum ProcessingStatus {
  PENDING = 'pending',
  QUEUED = 'queued',
  RUNNING = 'running',
  WAITING_FOR_TELEMETRY = 'waiting_for_telemetry',
  COMPLETED = 'completed',
  COMPLETED_WITH_GAPS = 'completed_with_gaps',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  DEAD_LETTER = 'dead_letter',
}

export enum SigNozMode {
  SELF_HOSTED = 'self_hosted',
  CLOUD = 'cloud',
}

@Entity('signoz_connections')
@Index('IDX_signoz_connections_company_updated', ['businessId', 'updatedAt'])
@Unique('UQ_signoz_connections_company_name', ['businessId', 'name'])
export class SigNozConnection extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'enum', enum: SigNozMode, enumName: 'signoz_mode_enum' })
  mode: SigNozMode;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({ type: 'varchar', length: 2048 })
  apiUrl: string;

  @Column({ type: 'varchar', length: 2048 })
  uiUrl: string;

  @Column({ type: 'text', select: false })
  encryptedApiKey: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  ingestionEndpoint: string | null;

  @Column({ type: 'varchar', length: 32, default: 'unverified' })
  status: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastValidatedAt: Date | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  lastValidationErrorCode: string | null;

  @Column({ type: 'uuid' })
  createdBy: string;
}

@Entity('investigations')
@Index('IDX_investigations_company_created', ['businessId', 'createdAt', 'id'])
@Index('IDX_investigations_company_status', ['businessId', 'status'])
@Index('IDX_investigations_violation', ['violationId'])
@Unique('UQ_investigations_company_config', [
  'businessId',
  'violationId',
  'configurationHash',
])
export class Investigation extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'uuid' })
  violationId: string;

  @Column({ type: 'uuid' })
  workflowId: string;

  @Column({ type: 'uuid' })
  ruleId: string;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    enumName: 'processing_status_enum',
    default: ProcessingStatus.PENDING,
  })
  status: ProcessingStatus;

  @Column({ type: 'varchar', length: 64 })
  trigger: string;

  @Column({ type: 'varchar', length: 64 })
  configurationHash: string;

  @Column({ type: 'uuid' })
  requestedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancelledAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancellationRequestedAt: Date | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  confidence: string | null;

  @Column({ type: 'text', nullable: true })
  summary: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  topContributor: string | null;

  @Column({ type: 'int', default: 0 })
  dataGapCount: number;

  @Column({ type: 'int', default: 0 })
  evidenceCount: number;

  @Column({ type: 'varchar', length: 120, nullable: true })
  errorCode: string | null;

  @Column({ type: 'text', nullable: true })
  errorMessage: string | null;

  @OneToMany(() => InvestigationStep, (step) => step.investigation)
  steps: InvestigationStep[];

  @OneToMany(() => Evidence, (evidence) => evidence.investigation)
  evidence: Evidence[];
}

@Entity('investigation_steps')
@Index('IDX_investigation_steps_investigation_status', [
  'investigationId',
  'status',
])
@Unique('UQ_investigation_steps_sequence', ['investigationId', 'sequence'])
export class InvestigationStep extends BaseEntity {
  @Column({ type: 'uuid' })
  investigationId: string;

  @ManyToOne(() => Investigation, (investigation) => investigation.steps, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'investigationId' })
  investigation: Investigation;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'varchar', length: 64 })
  type: string;

  @Column({ type: 'varchar', length: 160 })
  name: string;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    enumName: 'processing_status_enum',
  })
  status: ProcessingStatus;

  @Column({ type: 'jsonb', nullable: true })
  inputRedacted: Record<string, unknown> | null;

  @Column({ type: 'jsonb', nullable: true })
  outputSummary: Record<string, unknown> | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  errorCode: string | null;
}

@Entity('evidence')
@Index('IDX_evidence_company_created', ['businessId', 'createdAt', 'id'])
@Index('IDX_evidence_investigation_signal', ['investigationId', 'signal'])
@Index('IDX_evidence_trace', ['traceId'])
export class Evidence extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'uuid' })
  investigationId: string;

  @ManyToOne(() => Investigation, (investigation) => investigation.evidence, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'investigationId' })
  investigation: Investigation;

  @Column({ type: 'varchar', length: 48 })
  type: string;

  @Column({ type: 'varchar', length: 32 })
  signal: string;

  @Column({ type: 'varchar', length: 64 })
  sourceSystem: string;

  @Column({ type: 'varchar', length: 120, nullable: true })
  queryId: string | null;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text' })
  summary: string;

  @Column({ type: 'timestamptz' })
  timeRangeStart: Date;

  @Column({ type: 'timestamptz' })
  timeRangeEnd: Date;

  @Column({ type: 'varchar', length: 255, nullable: true })
  serviceName: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  serviceVersion: string | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  traceId: string | null;

  @Column({ type: 'varchar', length: 16, nullable: true })
  spanId: string | null;

  @Column({ type: 'double precision', nullable: true })
  measuredValue: number | null;

  @Column({ type: 'varchar', length: 32, nullable: true })
  unit: string | null;

  @Column({ type: 'double precision', nullable: true })
  confidence: number | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  reference: string | null;

  @Column({ type: 'jsonb', nullable: true })
  redactedSnapshot: Record<string, unknown> | null;
}

@Entity('agent_runs')
@Index('IDX_agent_runs_investigation_created', ['investigationId', 'createdAt'])
export class AgentRun extends BaseEntity {
  @Column({ type: 'uuid' })
  investigationId: string;

  @ManyToOne(() => Investigation, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'investigationId' })
  investigation: Investigation;

  @Column({ type: 'varchar', length: 64 })
  provider: string;

  @Column({ type: 'varchar', length: 120 })
  model: string;

  @Column({ type: 'varchar', length: 64 })
  policyVersion: string;

  @Column({ type: 'int' })
  maxSteps: number;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    enumName: 'processing_status_enum',
  })
  status: ProcessingStatus;

  @Column({ type: 'int', nullable: true })
  inputTokenCount: number | null;

  @Column({ type: 'int', nullable: true })
  outputTokenCount: number | null;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  errorCode: string | null;

  @OneToMany(() => AgentToolCall, (call) => call.agentRun)
  toolCalls: AgentToolCall[];
}

@Entity('agent_tool_calls')
@Unique('UQ_agent_tool_calls_sequence', ['agentRunId', 'sequence'])
@Index('IDX_agent_tool_calls_run_status', ['agentRunId', 'status'])
export class AgentToolCall extends BaseEntity {
  @Column({ type: 'uuid' })
  agentRunId: string;

  @ManyToOne(() => AgentRun, (run) => run.toolCalls, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'agentRunId' })
  agentRun: AgentRun;

  @Column({ type: 'int' })
  sequence: number;

  @Column({ type: 'varchar', length: 120 })
  toolName: string;

  @Column({ type: 'jsonb', nullable: true })
  inputRedacted: Record<string, unknown> | null;

  @Column({ type: 'uuid', array: true, default: () => "'{}'::uuid[]" })
  outputEvidenceIds: string[];

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    enumName: 'processing_status_enum',
  })
  status: ProcessingStatus;

  @Column({ type: 'int', nullable: true })
  durationMs: number | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  errorCode: string | null;
}

abstract class DurableResultEntity extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({
    type: 'enum',
    enum: ProcessingStatus,
    enumName: 'processing_status_enum',
    default: ProcessingStatus.PENDING,
  })
  status: ProcessingStatus;

  @Column({ type: 'uuid' })
  requestedBy: string;

  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  cancellationRequestedAt: Date | null;

  @Column({ type: 'varchar', length: 120, nullable: true })
  errorCode: string | null;
}

@Entity('workflow_comparisons')
@Index('IDX_comparisons_company_created', ['businessId', 'createdAt', 'id'])
@Index('IDX_comparisons_company_status', ['businessId', 'status'])
@Unique('UQ_comparisons_company_config', ['businessId', 'configurationHash'])
export class WorkflowComparison extends DurableResultEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 64 })
  configurationHash: string;

  @Column({ type: 'jsonb' })
  configuration: Record<string, unknown>;

  @Column({ type: 'int', default: 0 })
  cohortASize: number;

  @Column({ type: 'int', default: 0 })
  cohortBSize: number;

  @Column({ type: 'jsonb', nullable: true })
  resultSummary: Record<string, unknown> | null;
}

@Entity('rule_simulations')
@Index('IDX_simulations_company_created', ['businessId', 'createdAt', 'id'])
@Index('IDX_simulations_company_status', ['businessId', 'status'])
@Unique('UQ_simulations_company_hash_range', [
  'businessId',
  'draftHash',
  'from',
  'to',
])
export class RuleSimulation extends DurableResultEntity {
  @Column({ type: 'uuid', nullable: true })
  ruleId: string | null;

  @Column({ type: 'jsonb' })
  draftSnapshot: Record<string, unknown>;

  @Column({ type: 'varchar', length: 64 })
  draftHash: string;

  @Column({ type: 'timestamptz' })
  from: Date;

  @Column({ type: 'timestamptz' })
  to: Date;

  @Column({ type: 'int', default: 0 })
  workflowsEvaluated: number;

  @Column({ type: 'int', default: 0 })
  wouldComplete: number;

  @Column({ type: 'int', default: 0 })
  wouldViolate: number;

  @Column({ type: 'int', default: 0 })
  wouldCompleteLate: number;

  @Column({ type: 'jsonb', nullable: true })
  result: Record<string, unknown> | null;
}

@Entity('deployment_observations')
@Index('IDX_deployments_company_observed', [
  'businessId',
  'firstObservedAt',
  'id',
])
@Unique('UQ_deployments_company_service_env_version', [
  'businessId',
  'serviceName',
  'environment',
  'version',
])
export class DeploymentObservation extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'varchar', length: 255 })
  serviceName: string;

  @Column({ type: 'varchar', length: 120 })
  environment: string;

  @Column({ type: 'varchar', length: 255 })
  version: string;

  @Column({ type: 'timestamptz' })
  firstObservedAt: Date;

  @Column({ type: 'timestamptz' })
  lastObservedAt: Date;

  @Column({ type: 'varchar', length: 64 })
  source: string;
}

@Entity('telemetry_quality_snapshots')
@Index('IDX_quality_company_created', ['businessId', 'createdAt', 'id'])
@Index('IDX_quality_company_scope_time', [
  'businessId',
  'scopeType',
  'scopeKey',
  'to',
])
export class TelemetryQualitySnapshot extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'varchar', length: 32 })
  scopeType: string;

  @Column({ type: 'varchar', length: 255 })
  scopeKey: string;

  @Column({ type: 'timestamptz' })
  from: Date;

  @Column({ type: 'timestamptz' })
  to: Date;

  @Column({ type: 'double precision' })
  score: number;

  @Column({ type: 'jsonb' })
  dimensions: Record<string, unknown>;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  criticalGaps: unknown[];
}

@Entity('audit_logs')
@Index('IDX_audit_logs_company_created', ['businessId', 'createdAt', 'id'])
@Index('IDX_audit_logs_entity', ['entityType', 'entityId'])
export class AuditLog extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'uuid', nullable: true })
  actorId: string | null;

  @Column({ type: 'varchar', length: 120 })
  action: string;

  @Column({ type: 'varchar', length: 64 })
  entityType: string;

  @Column({ type: 'uuid', nullable: true })
  entityId: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;
}
