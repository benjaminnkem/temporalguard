import { Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities';

@Entity('workflows')
export class Workflow extends BaseEntity {}
