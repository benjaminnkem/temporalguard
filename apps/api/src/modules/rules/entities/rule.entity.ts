import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Violation } from '../../violations/entities';
import { Workflow } from '../../workflows/entities';
import { RuleOperator } from '../enums/rule-operator.enum';
import { RuleSeverity } from '../enums/rule-severity.enum';
import { TimeoutUnit } from '../enums/timeout-unit.enum';

@Entity('rules')
export class Rule extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'varchar', length: 255 })
  triggerEvent: string;

  @Column({ type: 'text', array: true })
  expectedEvents: string[];

  @Column({ type: 'enum', enum: RuleOperator, default: RuleOperator.ALL })
  operator: RuleOperator;

  @Column({ type: 'int' })
  timeoutValue: number;

  @Column({ type: 'enum', enum: TimeoutUnit, default: TimeoutUnit.MINUTES })
  timeoutUnit: TimeoutUnit;

  @Column({ type: 'enum', enum: RuleSeverity, default: RuleSeverity.MEDIUM })
  severity: RuleSeverity;

  @Column({ type: 'boolean', default: true })
  enabled: boolean;

  @OneToMany(() => Workflow, (workflow) => workflow.rule)
  workflows: Workflow[];

  @OneToMany(() => Violation, (violation) => violation.rule)
  violations: Violation[];
}
