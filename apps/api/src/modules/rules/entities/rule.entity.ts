import { Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities';

@Entity('rules')
export class Rule extends BaseEntity {}
