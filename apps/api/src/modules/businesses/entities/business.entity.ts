import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { BusinessEvent, EventLog } from '../../events/entities';
import { Rule } from '../../rules/entities';
import { Violation } from '../../violations/entities';
import { ExternalWorkflow, Workflow } from '../../workflows/entities';
import { User } from '../../users/entities';
import { BusinessApiKey } from './business-api-key.entity';

@Entity('businesses')
export class Business extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  logoUrl: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  logoPublicId: string | null;

  @Column({ type: 'varchar', length: 2048, nullable: true })
  website: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @OneToMany(() => User, (user) => user.business)
  users: User[];

  @OneToMany(() => BusinessApiKey, (apiKey) => apiKey.business)
  apiKeys: BusinessApiKey[];

  @OneToMany(() => BusinessEvent, (event) => event.business)
  events: BusinessEvent[];

  @OneToMany(() => EventLog, (log) => log.business)
  eventLogs: EventLog[];

  @OneToMany(() => Rule, (rule) => rule.business)
  rules: Rule[];

  @OneToMany(() => ExternalWorkflow, (workflow) => workflow.business)
  externalWorkflows: ExternalWorkflow[];

  @OneToMany(() => Workflow, (workflow) => workflow.business)
  workflows: Workflow[];

  @OneToMany(() => Violation, (violation) => violation.business)
  violations: Violation[];
}
