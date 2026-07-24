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

  async create(
    createViolationDto: CreateViolationDto | Partial<Violation>,
  ): Promise<Violation> {
    const violation = this.violationsRepository.create(
      createViolationDto as DeepPartial<Violation>,
    );
    const saved = await this.violationsRepository.save(violation);

    try {
      const fullViolation = await this.findOne(saved.businessId, saved.id);
      this.eventEmitter.emit(EVENT_VIOLATION_CREATED, {
        businessId: fullViolation.businessId,
        violationId: fullViolation.id,
        workflowId: fullViolation.workflowId,
        ruleId: fullViolation.ruleId,
        ruleName: fullViolation.rule?.name || '',
        severity: fullViolation.severity,
      });
    } catch {
      // Telemetry enrichment is best-effort; the violation is already saved.
    }

    return saved;
  }

  async findAll(businessId: string): Promise<Violation[]> {
    const violations = await this.violationsRepository.find({
      where: { businessId },
      withDeleted: true,
      order: { occurredAt: 'DESC' },
      relations: {
        workflow: {
          rule: {
            triggerEventDefinition: true,
            expectedEventDefinitions: true,
          },
          externalWorkflow: { eventLogs: { event: true } },
        },
        rule: {
          triggerEventDefinition: true,
          expectedEventDefinitions: true,
        },
      },
    });
    return violations.map((violation) => this.withRuleEventNames(violation));
  }

  async findOne(businessId: string, id: string): Promise<Violation> {
    const violation = await this.violationsRepository.findOne({
      where: { id, businessId },
      withDeleted: true,
      relations: {
        workflow: {
          rule: {
            triggerEventDefinition: true,
            expectedEventDefinitions: true,
          },
          externalWorkflow: { eventLogs: { event: true } },
        },
        rule: {
          triggerEventDefinition: true,
          expectedEventDefinitions: true,
        },
      },
    });

    if (!violation) {
      throw new NotFoundException(`Violation with id "${id}" not found`);
    }

    return this.withRuleEventNames(violation);
  }

  async update(
    businessId: string,
    id: string,
    updateViolationDto: UpdateViolationDto,
  ): Promise<Violation> {
    const violation = await this.findOne(businessId, id);
    Object.assign(violation, updateViolationDto, { businessId });
    return this.violationsRepository.save(violation);
  }

  async remove(businessId: string, id: string): Promise<void> {
    const violation = await this.findOne(businessId, id);
    await this.violationsRepository.remove(violation);
  }

  private withRuleEventNames(violation: Violation): Violation {
    for (const rule of [violation.rule, violation.workflow?.rule]) {
      if (!rule) continue;
      rule.triggerEvent = rule.triggerEventDefinition?.name;
      rule.expectedEvents =
        rule.expectedEventDefinitions?.map((event) => event.name) ?? [];
    }
    return violation;
  }
}
