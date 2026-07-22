import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DeepPartial, Repository } from 'typeorm';
import { CreateViolationDto, UpdateViolationDto } from '../dto';
import { Violation } from '../entities';
import { TelemetryService } from '../../telemetry/services/telemetry.service';

@Injectable()
export class ViolationsService {
  constructor(
    @InjectRepository(Violation)
    private readonly violationsRepository: Repository<Violation>,
    private readonly telemetryService: TelemetryService,
  ) {}

  async create(createViolationDto: CreateViolationDto | Partial<Violation>): Promise<Violation> {
    const violation = this.violationsRepository.create(createViolationDto as DeepPartial<Violation>);
    const saved = await this.violationsRepository.save(violation);

    try {
      const fullViolation = await this.findOne(saved.id);
      this.telemetryService.violationCreated(
        fullViolation.id,
        fullViolation.workflowId,
        fullViolation.ruleId,
        fullViolation.rule?.name || '',
        fullViolation.severity,
      );
    } catch (e) {
      // Ignore telemetry errors
    }

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
