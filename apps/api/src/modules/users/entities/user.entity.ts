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
import { RefreshSession } from '../../auth/entities';

@Entity('users')
@Index('IDX_users_business', ['businessId'])
export class User extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.users, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'varchar', length: 120 })
  firstName: string;

  @Column({ type: 'varchar', length: 120 })
  lastName: string;

  @Column({ type: 'varchar', length: 320 })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  passwordHash: string;

  @Column({ type: 'varchar', length: 32, default: 'active' })
  status: 'active' | 'disabled';

  @OneToMany(() => RefreshSession, (session) => session.user)
  refreshSessions: RefreshSession[];
}
