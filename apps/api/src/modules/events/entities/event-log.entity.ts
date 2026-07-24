import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Business } from '../../businesses/entities';
import { ExternalWorkflow } from '../../workflows/entities';
import { BusinessEvent } from './business-event.entity';

@Entity('event_logs')
export class EventLog extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.eventLogs, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'uuid' })
  eventId: string;

  @ManyToOne(() => BusinessEvent, (event) => event.logs, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'eventId' })
  event: BusinessEvent;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown> | null;

  @Column({ type: 'uuid', nullable: true })
  externalWorkflowRecordId: string | null;

  @ManyToOne(() => ExternalWorkflow, (workflow) => workflow.eventLogs, {
    onDelete: 'SET NULL',
    nullable: true,
  })
  @JoinColumn({ name: 'externalWorkflowRecordId' })
  externalWorkflow: ExternalWorkflow | null;
}
