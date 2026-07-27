import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Business } from '../../businesses/entities';
import { EventLog } from './event-log.entity';

@Entity('event_ingest_idempotency')
@Unique('UQ_event_ingest_idempotency_business_key', [
  'businessId',
  'idempotencyKey',
])
export class EventIngestIdempotency extends BaseEntity {
  @Column({ type: 'uuid' })
  @Index('IDX_event_ingest_idempotency_business')
  businessId: string;

  @ManyToOne(() => Business, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'varchar', length: 128 })
  idempotencyKey: string;

  @Column({ type: 'uuid' })
  eventLogId: string;

  @ManyToOne(() => EventLog, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'eventLogId' })
  eventLog: EventLog;

  @Column({ type: 'timestamptz' })
  @Index('IDX_event_ingest_idempotency_expires')
  expiresAt: Date;
}
