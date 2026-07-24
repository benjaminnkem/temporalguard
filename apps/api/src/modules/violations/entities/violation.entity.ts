import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Business } from '../../businesses/entities';
import { Rule } from '../../rules/entities';
import { Workflow } from '../../workflows/entities';
import { ViolationSeverity } from '../enums/violation-severity.enum';

@Entity('violations')
export class Violation extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.violations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({
    type: 'enum',
    enum: ViolationSeverity,
    default: ViolationSeverity.MEDIUM,
  })
  severity: ViolationSeverity;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'timestamptz', default: () => 'CURRENT_TIMESTAMP' })
  occurredAt: Date;

  @Column({ type: 'jsonb', nullable: true })
  details: Record<string, unknown>;

  @Column({ type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.violations, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;

  @Column({ type: 'uuid' })
  ruleId: string;

  @ManyToOne(() => Rule, (rule) => rule.violations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'ruleId' })
  rule: Rule;
}
