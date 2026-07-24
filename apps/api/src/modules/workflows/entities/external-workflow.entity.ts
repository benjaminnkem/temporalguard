import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { EventLog } from '../../events/entities';
import { Workflow } from './workflow.entity';

@Entity('external_workflows')
export class ExternalWorkflow extends BaseEntity {
  @Column({ type: 'varchar', length: 255, unique: true })
  externalId: string;

  @OneToMany(() => Workflow, (workflow) => workflow.externalWorkflow)
  workflows: Workflow[];

  @OneToMany(() => EventLog, (log) => log.externalWorkflow)
  eventLogs: EventLog[];
}
