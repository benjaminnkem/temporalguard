import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToMany,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Business } from '../../businesses/entities';
import { Rule } from '../../rules/entities';
import { EventType } from '../enums/event-type.enum';
import { EventLog } from './event-log.entity';

@Entity('business_events')
@Index('UQ_business_events_business_name', ['businessId', 'name'], {
  unique: true,
})
export class BusinessEvent extends BaseEntity {
  usageCount?: number;

  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.events, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'varchar', length: 255 })
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
