import {
  Column,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Business } from '../../businesses/entities';
import { BusinessEvent } from '../../events/entities';
import { Violation } from '../../violations/entities';
import { Workflow } from '../../workflows/entities';
import { RuleOperator } from '../enums/rule-operator.enum';
import { RuleSeverity } from '../enums/rule-severity.enum';
import { TimeoutUnit } from '../enums/timeout-unit.enum';

@Entity('rules')
export class Rule extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.rules, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'businessId' })
  business: Business;

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

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  triggerFilters: Array<Record<string, unknown>>;

  @Column({ type: 'varchar', length: 255, default: 'workflow.id' })
  correlationKey: string;

  @Column({ type: 'text', array: true, default: () => "ARRAY['production']" })
  environments: string[];

  @DeleteDateColumn({ type: 'timestamptz', nullable: true })
  deletedAt: Date | null;

  @OneToMany(() => Workflow, (workflow) => workflow.rule)
  workflows: Workflow[];

  @OneToMany(() => Violation, (violation) => violation.rule)
  violations: Violation[];
}
