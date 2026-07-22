import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Workflow } from '../../workflows/entities';
import { EventType } from '../enums/event-type.enum';

@Entity('business_events')
export class BusinessEvent extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  event: string;

  @Column({ type: 'enum', enum: EventType, default: EventType.BUSINESS })
  type: EventType;

  @Column({ type: 'timestamptz' })
  timestamp: Date;

  @Column({ type: 'jsonb', nullable: true })
  payload: Record<string, unknown>;

  @Column({ type: 'uuid' })
  workflowId: string;

  @ManyToOne(() => Workflow, (workflow) => workflow.businessEvents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'workflowId' })
  workflow: Workflow;
}
