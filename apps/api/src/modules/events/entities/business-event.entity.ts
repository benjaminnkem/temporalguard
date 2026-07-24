import { Column, Entity, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Rule } from '../../rules/entities';
import { EventType } from '../enums/event-type.enum';
import { EventLog } from './event-log.entity';

@Entity('business_events')
export class BusinessEvent extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  name: string;

  @Column({ type: 'enum', enum: EventType, default: EventType.BUSINESS })
  type: EventType;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'jsonb', nullable: true })
  metadata: Record<string, unknown> | null;

  @OneToMany(() => EventLog, (log) => log.event)
  logs: EventLog[];

  @OneToMany(() => Rule, (rule) => rule.triggerEventDefinition)
  triggeredRules: Rule[];

  @ManyToMany(() => Rule, (rule) => rule.expectedEventDefinitions)
  expectedByRules: Rule[];
}
