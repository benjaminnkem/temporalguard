import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../../common/entities';
import { User } from '../../users/entities';
import { ApiKeyEnvironment } from '../enums/api-key-environment.enum';
import { Business } from './business.entity';

@Entity('business_api_keys')
export class BusinessApiKey extends BaseEntity {
  @Column({ type: 'uuid' })
  businessId: string;

  @ManyToOne(() => Business, (business) => business.apiKeys, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'businessId' })
  business: Business;

  @Column({ type: 'varchar', length: 120 })
  name: string;

  @Column({
    type: 'varchar',
    length: 16,
    default: ApiKeyEnvironment.LIVE,
  })
  environment: ApiKeyEnvironment;

  @Column({ type: 'varchar', length: 24 })
  keyPrefix: string;

  @Column({ type: 'varchar', length: 255 })
  keyHash: string;

  @Column({ type: 'timestamptz', nullable: true })
  lastUsedAt: Date | null;

  @Column({ type: 'timestamptz', nullable: true })
  revokedAt: Date | null;

  @Column({ type: 'uuid', nullable: true })
  createdByUserId: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User | null;
}
