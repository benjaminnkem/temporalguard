import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Violation } from '../../violations/entities';
import { Workflow } from '../../workflows/entities';
import { RuleOperator } from '../enums/rule-operator.enum';
import { RuleSeverity } from '../enums/rule-severity.enum';
import { RuleStatus } from '../enums/rule-status.enum';

@Entity('rules')
export class Rule extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'enum', enum: RuleStatus, default: RuleStatus.DRAFT })
  status: RuleStatus;

  @Column({ type: 'enum', enum: RuleSeverity, default: RuleSeverity.MEDIUM })
  severity: RuleSeverity;

  @Column({ type: 'enum', enum: RuleOperator, default: RuleOperator.ALL })
  operator: RuleOperator;

  @Column({ type: 'jsonb', nullable: true })
  definition: Record<string, unknown>;

  @OneToMany(() => Workflow, (workflow) => workflow.rule)
  workflows: Workflow[];

  @OneToMany(() => Violation, (violation) => violation.rule)
  violations: Violation[];
}
