import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { Business } from '../../businesses/entities';
import { EventLog } from '../../events/entities';
import { Workflow } from './workflow.entity';

@Entity('external_workflows')
@Index(
  'UQ_external_workflows_business_external_id',
  ['businessId', 'externalId'],
  {
    unique: true,
  },
)
export class ExternalWorkflow extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.externalWorkflows, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'varchar', length: 255 })
  externalId: string;

  @OneToMany(() => Workflow, (workflow) => workflow.externalWorkflow)
  workflows: Workflow[];

  @OneToMany(() => EventLog, (log) => log.externalWorkflow)
  eventLogs: EventLog[];
}
