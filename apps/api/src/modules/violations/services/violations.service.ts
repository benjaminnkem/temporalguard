import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DeepPartial, Repository } from 'typeorm';
import { CreateViolationDto, UpdateViolationDto } from '../dto';
import { Violation } from '../entities';
import { EVENT_VIOLATION_CREATED } from '../../../common/constants/event.constants';

@Injectable()
export class ViolationsService {
  constructor(
    @InjectRepository(Violation)
    private readonly violationsRepository: Repository<Violation>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(createViolationDto: CreateViolationDto | Partial<Violation>): Promise<Violation> {
    const violation = this.violationsRepository.create(createViolationDto as DeepPartial<Violation>);
    const saved = await this.violationsRepository.save(violation);

    try {
      const fullViolation = await this.findOne(saved.id);
      this.eventEmitter.emit(EVENT_VIOLATION_CREATED, {
        violationId: fullViolation.id,
        workflowId: fullViolation.workflowId,
        ruleId: fullViolation.ruleId,
        ruleName: fullViolation.rule?.name || '',
        severity: fullViolation.severity,
      });
    } catch (e) {}

    return saved;
  }

  async findAll(): Promise<Violation[]> {
    return this.violationsRepository.find({
      order: { occurredAt: 'DESC' },
      relations: { workflow: true, rule: true },
    });
  }

  async findOne(id: string): Promise<Violation> {
    const violation = await this.violationsRepository.findOne({
      where: { id },
      relations: { workflow: true, rule: true },
    });

    if (!violation) {
      throw new NotFoundException(`Violation with id "${id}" not found`);
    }

    return violation;
  }

  async update(
    id: string,
    updateViolationDto: UpdateViolationDto,
  ): Promise<Violation> {
    const violation = await this.findOne(id);
    Object.assign(violation, updateViolationDto);
    return this.violationsRepository.save(violation);
  }

  async remove(id: string): Promise<void> {
    const violation = await this.findOne(id);
    await this.violationsRepository.remove(violation);
  }
}
