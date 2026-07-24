import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { In, Repository } from 'typeorm';
import { CreateWorkflowDto, UpdateWorkflowDto } from '../dto';
import { ExternalWorkflow, Workflow } from '../entities';
import { RulesService } from '../../rules/services/rules.service';
import { WorkflowQueueService } from './workflow-queue.service';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { TimeoutUnit } from '../../rules/enums/timeout-unit.enum';
import {
  EVENT_WORKFLOW_CREATED,
  EVENT_WORKFLOW_COMPLETED,
  EVENT_WORKFLOW_OVERDUE,
} from '../../../common/constants/event.constants';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>,
    @InjectRepository(ExternalWorkflow)
    private readonly externalWorkflowsRepository: Repository<ExternalWorkflow>,
    private readonly rulesService: RulesService,
    private readonly workflowQueueService: WorkflowQueueService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(
    businessId: string,
    createWorkflowDto: CreateWorkflowDto,
  ): Promise<Workflow> {
    const rule = await this.rulesService.findOne(
      businessId,
      createWorkflowDto.ruleId,
    );
    const externalWorkflow = createWorkflowDto.externalId
      ? await this.findOrCreateExternalWorkflow(
          businessId,
          createWorkflowDto.externalId,
        )
      : null;
    if (externalWorkflow) {
      const existing = await this.findWaitingForRuleAndExternalWorkflow(
        rule.id,
        externalWorkflow.id,
      );
      if (existing) return existing;
    }
    const deadline = this.calculateDeadline(
      new Date(),
      rule.timeoutValue,
      rule.timeoutUnit,
    );
    const workflow = this.workflowsRepository.create({
      ...createWorkflowDto,
      businessId,
      externalWorkflowId: externalWorkflow?.id ?? null,
      externalWorkflow,
      deadline,
      currentState: {
        receivedEvents: [],
        expectedEvents: rule.expectedEvents ?? [],
        operator: rule.operator,
      },
    });

    const saved = await this.workflowsRepository.save(workflow);

    await this.workflowQueueService.scheduleTimeout(
      saved.businessId,
      saved.id,
      rule.id,
      saved.deadline,
    );

    this.eventEmitter.emit(EVENT_WORKFLOW_CREATED, {
      businessId: saved.businessId,
      workflowId: saved.id,
      ruleId: rule.id,
      ruleName: rule.name,
      status: saved.status,
    });

    return saved;
  }

  async findAll(businessId: string): Promise<Workflow[]> {
    const workflows = await this.workflowsRepository.find({
      where: { businessId },
      withDeleted: true,
      order: { createdAt: 'DESC' },
      relations: {
        rule: {
          triggerEventDefinition: true,
          expectedEventDefinitions: true,
        },
        externalWorkflow: true,
      },
    });
    return workflows.map((workflow) => this.withRuleEventNames(workflow));
  }

  async findOne(businessId: string, id: string): Promise<Workflow> {
    const workflow = await this.workflowsRepository.findOne({
      where: { id, businessId },
      withDeleted: true,
      relations: {
        rule: {
          triggerEventDefinition: true,
          expectedEventDefinitions: true,
        },
        externalWorkflow: { eventLogs: { event: true } },
      },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with id "${id}" not found`);
    }

    return this.withRuleEventNames(workflow);
  }

  async update(
    businessId: string,
    id: string,
    updateWorkflowDto: UpdateWorkflowDto,
  ): Promise<Workflow> {
    const workflow = await this.findOne(businessId, id);
    const oldStatus = workflow.status;
    Object.assign(workflow, updateWorkflowDto, { businessId });
    const saved = await this.workflowsRepository.save(workflow);

    if (oldStatus !== saved.status) {
      this.handleStatusChangeEvents(saved);
    }

    return saved;
  }

  async updateStatus(
    businessId: string,
    id: string,
    status: WorkflowStatus,
  ): Promise<Workflow> {
    const workflow = await this.findOne(businessId, id);
    const oldStatus = workflow.status;
    workflow.status = status;
    const saved = await this.workflowsRepository.save(workflow);

    if (oldStatus !== saved.status) {
      this.handleStatusChangeEvents(saved);
    }

    return saved;
  }

  async remove(businessId: string, id: string): Promise<void> {
    const workflow = await this.findOne(businessId, id);
    await this.workflowsRepository.remove(workflow);
  }

  async createFromRule(
    data: Partial<Workflow> & { ruleId: string; deadline: Date },
  ): Promise<Workflow> {
    const workflow = this.workflowsRepository.create(data);
    const saved = await this.workflowsRepository.save(workflow);

    await this.workflowQueueService.scheduleTimeout(
      saved.businessId,
      saved.id,
      data.ruleId,
      saved.deadline,
    );

    const rule = await this.rulesService.findOne(saved.businessId, data.ruleId);
    this.eventEmitter.emit(EVENT_WORKFLOW_CREATED, {
      businessId: saved.businessId,
      workflowId: saved.id,
      ruleId: rule.id,
      ruleName: rule.name,
      status: saved.status,
    });

    return saved;
  }

  async findOrCreateExternalWorkflow(
    businessId: string,
    externalId: string,
  ): Promise<ExternalWorkflow> {
    const existing = await this.externalWorkflowsRepository.findOne({
      where: { businessId, externalId },
    });
    if (existing) return existing;
    try {
      return await this.externalWorkflowsRepository.save(
        this.externalWorkflowsRepository.create({ businessId, externalId }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const concurrentlyCreated =
          await this.externalWorkflowsRepository.findOne({
            where: { businessId, externalId },
          });
        if (concurrentlyCreated) return concurrentlyCreated;
      }
      throw error;
    }
  }

  async findWaitingForRuleAndExternalWorkflow(
    ruleId: string,
    externalWorkflowId: string,
  ): Promise<Workflow | null> {
    return this.workflowsRepository.findOne({
      where: {
        ruleId,
        externalWorkflowId,
        status: WorkflowStatus.WAITING,
      },
      relations: {
        rule: {
          triggerEventDefinition: true,
          expectedEventDefinitions: true,
        },
        externalWorkflow: true,
      },
      order: { createdAt: 'DESC' },
    });
  }

  async findWaitingByExternalWorkflowAndRules(
    externalWorkflowId: string,
    ruleIds: string[],
  ): Promise<Workflow[]> {
    if (ruleIds.length === 0) return [];
    return this.workflowsRepository.find({
      where: {
        externalWorkflowId,
        ruleId: In(ruleIds),
        status: WorkflowStatus.WAITING,
      },
      relations: {
        rule: {
          triggerEventDefinition: true,
          expectedEventDefinitions: true,
        },
        externalWorkflow: true,
      },
    });
  }

  async saveState(
    workflow: Workflow,
    currentState: Record<string, unknown>,
    completed: boolean,
  ): Promise<Workflow> {
    workflow.currentState = currentState;
    if (completed) workflow.status = WorkflowStatus.COMPLETED;
    const saved = await this.workflowsRepository.save(workflow);
    if (completed) {
      this.handleStatusChangeEvents(saved);
    }
    return saved;
  }

  private handleStatusChangeEvents(workflow: Workflow): void {
    const durationMs = Date.now() - workflow.createdAt.getTime();
    if (workflow.status === WorkflowStatus.COMPLETED) {
      this.eventEmitter.emit(EVENT_WORKFLOW_COMPLETED, {
        businessId: workflow.businessId,
        workflowId: workflow.id,
        ruleId: workflow.ruleId,
        ruleName: workflow.rule?.name || '',
        status: workflow.status,
        durationMs,
      });
    } else if (workflow.status === WorkflowStatus.OVERDUE) {
      this.eventEmitter.emit(EVENT_WORKFLOW_OVERDUE, {
        businessId: workflow.businessId,
        workflowId: workflow.id,
        ruleId: workflow.ruleId,
        ruleName: workflow.rule?.name || '',
        status: workflow.status,
      });
    }
  }

  private withRuleEventNames(workflow: Workflow): Workflow {
    if (!workflow.rule) return workflow;
    workflow.rule.triggerEvent = workflow.rule.triggerEventDefinition?.name;
    workflow.rule.expectedEvents =
      workflow.rule.expectedEventDefinitions?.map((event) => event.name) ?? [];
    return workflow;
  }

  private calculateDeadline(
    from: Date,
    timeoutValue: number,
    timeoutUnit: TimeoutUnit,
  ): Date {
    const deadline = new Date(from);
    switch (timeoutUnit) {
      case TimeoutUnit.SECONDS:
        deadline.setSeconds(deadline.getSeconds() + timeoutValue);
        break;
      case TimeoutUnit.MINUTES:
        deadline.setMinutes(deadline.getMinutes() + timeoutValue);
        break;
      case TimeoutUnit.HOURS:
        deadline.setHours(deadline.getHours() + timeoutValue);
        break;
      case TimeoutUnit.DAYS:
        deadline.setDate(deadline.getDate() + timeoutValue);
        break;
    }
    return deadline;
  }
}
