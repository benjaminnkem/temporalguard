import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { BusinessEvent } from '../../events/entities';
import { Rule } from '../../rules/entities';
import { Violation } from '../../violations/entities';
import { WorkflowStatus } from '../enums/workflow-status.enum';

@Entity('workflows')
export class Workflow extends BaseEntity {
  @Column({ type: 'varchar', length: 255, nullable: true })
  externalId: string;

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

  @OneToMany(() => BusinessEvent, (event) => event.workflow)
  businessEvents: BusinessEvent[];

  @OneToMany(() => Violation, (violation) => violation.workflow)
  violations: Violation[];
}
