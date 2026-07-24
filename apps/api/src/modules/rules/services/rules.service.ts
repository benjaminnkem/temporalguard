import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BusinessEvent } from '../../events/entities';
import { CreateRuleDto, UpdateRuleDto } from '../dto';
import { Rule } from '../entities';

@Injectable()
export class RulesService {
  constructor(
    @InjectRepository(Rule)
    private readonly rulesRepository: Repository<Rule>,
    @InjectRepository(BusinessEvent)
    private readonly eventsRepository: Repository<BusinessEvent>,
  ) {}

  async create(dto: CreateRuleDto): Promise<Rule> {
    const { triggerEvent, expectedEvents, ...values } = dto;
    const trigger = await this.findOrCreateEvent(dto.businessId, triggerEvent);
    const expected = await Promise.all(
      [...new Set(expectedEvents)].map((name) =>
        this.findOrCreateEvent(dto.businessId, name),
      ),
    );
    const rule = this.rulesRepository.create({
      ...values,
      triggerEventId: trigger.id,
      triggerEventDefinition: trigger,
      expectedEventDefinitions: expected,
    });
    return this.withEventNames(await this.rulesRepository.save(rule));
  }

  async findAll(businessId: string): Promise<Rule[]> {
    const rules = await this.rulesRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      relations: {
        triggerEventDefinition: true,
        expectedEventDefinitions: true,
      },
    });
    return rules.map((rule) => this.withEventNames(rule));
  }

  async findOne(businessId: string, id: string): Promise<Rule> {
    const rule = await this.rulesRepository.findOne({
      where: { id, businessId },
      relations: {
        triggerEventDefinition: true,
        expectedEventDefinitions: true,
      },
    });
    if (!rule) {
      throw new NotFoundException(`Rule with id "${id}" not found`);
    }
    return this.withEventNames(rule);
  }

  async update(
    businessId: string,
    id: string,
    dto: UpdateRuleDto,
  ): Promise<Rule> {
    const rule = await this.findOne(businessId, id);
    const { triggerEvent, expectedEvents, ...values } = dto;
    Object.assign(rule, values, { businessId });

    if (triggerEvent !== undefined) {
      const event = await this.findOrCreateEvent(businessId, triggerEvent);
      rule.triggerEventId = event.id;
      rule.triggerEventDefinition = event;
    }
    if (expectedEvents !== undefined) {
      rule.expectedEventDefinitions = await Promise.all(
        [...new Set(expectedEvents)].map((name) =>
          this.findOrCreateEvent(businessId, name),
        ),
      );
    }
    return this.withEventNames(await this.rulesRepository.save(rule));
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.rulesRepository.remove(await this.findOne(businessId, id));
  }

  async findEnabledByTriggerEvent(
    businessId: string,
    eventId: string,
  ): Promise<Rule[]> {
    return this.rulesRepository.find({
      where: { businessId, triggerEventId: eventId, enabled: true },
      relations: {
        triggerEventDefinition: true,
        expectedEventDefinitions: true,
      },
    });
  }

  async findEnabledExpectingEvent(
    businessId: string,
    eventId: string,
  ): Promise<Rule[]> {
    return this.rulesRepository
      .createQueryBuilder('rule')
      .innerJoin('rule.expectedEventDefinitions', 'matchedExpectedEvent')
      .leftJoinAndSelect(
        'rule.expectedEventDefinitions',
        'expectedEventDefinitions',
      )
      .leftJoinAndSelect('rule.triggerEventDefinition', 'triggerEvent')
      .where('rule.enabled = :enabled', { enabled: true })
      .andWhere('rule.businessId = :businessId', { businessId })
      .andWhere('matchedExpectedEvent.id = :eventId', { eventId })
      .getMany();
  }

  private async findOrCreateEvent(
    businessId: string,
    name: string,
  ): Promise<BusinessEvent> {
    const existing = await this.eventsRepository.findOne({
      where: { businessId, name },
    });
    if (existing) return existing;
    try {
      return await this.eventsRepository.save(
        this.eventsRepository.create({ businessId, name }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const created = await this.eventsRepository.findOne({
          where: { businessId, name },
        });
        if (created) return created;
      }
      throw error;
    }
  }

  private withEventNames(rule: Rule): Rule {
    rule.triggerEvent = rule.triggerEventDefinition?.name;
    rule.expectedEvents =
      rule.expectedEventDefinitions?.map((event) => event.name) ?? [];
    return rule;
  }
}
