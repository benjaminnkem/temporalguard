import { Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities';

@Entity('business_events')
export class BusinessEvent extends BaseEntity {}
