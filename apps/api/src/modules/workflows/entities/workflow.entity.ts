import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Rule } from '../../rules/entities';
import { Violation } from '../../violations/entities';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { ExternalWorkflow } from './external-workflow.entity';

@Entity('workflows')
@Index('UQ_waiting_rule_external_workflow', ['ruleId', 'externalWorkflowId'], {
  unique: true,
  where: `"status" = 'waiting' AND "externalWorkflowId" IS NOT NULL`,
})
export class Workflow extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string | null;

  @Column({ type: 'uuid', nullable: true })
  externalWorkflowId: string | null;

  @ManyToOne(
    () => ExternalWorkflow,
    (externalWorkflow) => externalWorkflow.workflows,
    { onDelete: 'SET NULL', nullable: true },
  )
  @JoinColumn({ name: 'externalWorkflowId' })
  externalWorkflow: ExternalWorkflow | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  name: string;

  @Column({
    type: 'enum',
    enum: WorkflowStatus,
    default: WorkflowStatus.WAITING,
  })
  status: WorkflowStatus;

  @Column({ type: 'timestamptz' })
  deadline: Date;

  @Column({ type: 'jsonb', default: {} })
  currentState: Record<string, unknown>;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown>;

  @Column({ type: 'uuid' })
  ruleId: string;

  @ManyToOne(() => Rule, (rule) => rule.workflows, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule: Rule;

  @OneToMany(() => Violation, (violation) => violation.workflow)
  violations: Violation[];
}
