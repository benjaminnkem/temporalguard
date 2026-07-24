import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { BusinessEvent } from '../../events/entities';
import { Workflow } from '../../workflows/entities';
import { WorkflowStatus } from '../../workflows/enums/workflow-status.enum';
import { CreateRuleDto, TestRuleDto, UpdateRuleDto } from '../dto';
import { Rule } from '../entities';
import { RuleOperator } from '../enums';

@Injectable()
export class RulesService {
  constructor(
    @InjectRepository(Rule)
    private readonly rulesRepository: Repository<Rule>,
    @InjectRepository(BusinessEvent)
    private readonly eventsRepository: Repository<BusinessEvent>,
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>,
  ) {}

  async create(businessId: string, dto: CreateRuleDto): Promise<Rule> {
    const { triggerEvent, expectedEvents, ...values } = dto;
    const trigger = await this.findOrCreateEvent(businessId, triggerEvent);
    const expected = await Promise.all(
      [...new Set(expectedEvents)].map((name) =>
        this.findOrCreateEvent(businessId, name),
      ),
    );
    const rule = this.rulesRepository.create({
      ...values,
      businessId,
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

  async setEnabled(
    businessId: string,
    id: string,
    enabled: boolean,
  ): Promise<Rule> {
    const rule = await this.findOne(businessId, id);
    rule.enabled = enabled;
    return this.withEventNames(await this.rulesRepository.save(rule));
  }

  async remove(businessId: string, id: string): Promise<void> {
    await this.rulesRepository.manager.transaction(async (manager) => {
      const repository = manager.getRepository(Rule);
      const rule = await repository.findOne({ where: { id, businessId } });
      if (!rule) {
        throw new NotFoundException(`Rule with id "${id}" not found`);
      }
      rule.enabled = false;
      await repository.save(rule);
      await repository.softRemove(rule);
    });
  }

  async testDraft(businessId: string, input: TestRuleDto) {
    const referencedIds = [
      input.trigger.eventId,
      ...input.outcomes.map((outcome) => outcome.eventId),
    ];
    const ownedEventCount = await this.eventsRepository.countBy({
      businessId,
      id: In(referencedIds),
    });
    if (ownedEventCount !== new Set(referencedIds).size) {
      throw new NotFoundException(
        'One or more referenced events were not found',
      );
    }

    const workflows = await this.workflowsRepository.find({
      where: { businessId },
      order: { createdAt: 'DESC' },
      take: 1000,
    });
    const expected = input.outcomes.map((outcome) => outcome.canonicalName);
    let completedCount = 0;
    let violatedCount = 0;
    let openCount = 0;
    const completionDurations: number[] = [];

    for (const workflow of workflows) {
      const received = Array.isArray(workflow.currentState?.receivedEvents)
        ? workflow.currentState.receivedEvents.filter(
            (value): value is string => typeof value === 'string',
          )
        : [];
      const matched = this.matches(input.operator, expected, received);
      if (matched || workflow.status === WorkflowStatus.COMPLETED) {
        completedCount += 1;
        completionDurations.push(
          workflow.updatedAt.getTime() - workflow.createdAt.getTime(),
        );
      } else if (workflow.status === WorkflowStatus.OVERDUE) {
        violatedCount += 1;
      } else {
        openCount += 1;
      }
    }

    completionDurations.sort((left, right) => left - right);
    const medianCompletionMs =
      completionDurations.length === 0
        ? 0
        : completionDurations[Math.floor(completionDurations.length / 2)];
    return {
      evaluatedCount: workflows.length,
      completedCount,
      violatedCount,
      openCount,
      medianCompletionMs,
      dataMode: 'api' as const,
    };
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

  private matches(
    operator: RuleOperator,
    expected: string[],
    received: string[],
  ): boolean {
    if (operator === RuleOperator.ANY) {
      return expected.some((eventName) => received.includes(eventName));
    }
    if (operator === RuleOperator.SEQUENCE) {
      let position = 0;
      for (const eventName of received) {
        if (eventName === expected[position]) position += 1;
      }
      return position === expected.length;
    }
    if (operator === RuleOperator.FORBID) {
      return expected.every((eventName) => !received.includes(eventName));
    }
    return expected.every((eventName) => received.includes(eventName));
  }
}
