import { Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities';

@Entity('violations')
export class Violation extends BaseEntity {}
