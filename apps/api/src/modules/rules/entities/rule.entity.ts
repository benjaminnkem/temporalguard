import {
  Column,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { BusinessEvent } from '../../events/entities';
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

  @Column({ type: 'uuid' })
  triggerEventId: string;

  @ManyToOne(() => BusinessEvent, (event) => event.triggeredRules, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'triggerEventId' })
  triggerEventDefinition: BusinessEvent;

  @ManyToMany(() => BusinessEvent, (event) => event.expectedByRules, {
    cascade: false,
  })
  @JoinTable({
    name: 'rule_expected_events',
    joinColumn: { name: 'ruleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'eventId', referencedColumnName: 'id' },
  })
  expectedEventDefinitions: BusinessEvent[];

  // Name-based compatibility fields are populated by RulesService responses.
  triggerEvent?: string;
  expectedEvents?: string[];

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
