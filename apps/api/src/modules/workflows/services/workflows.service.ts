import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkflowDto, UpdateWorkflowDto } from '../dto';
import { Workflow } from '../entities';
import { RulesService } from '../../rules/services/rules.service';
import { WorkflowQueueService } from './workflow-queue.service';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { TimeoutUnit } from '../../rules/enums/timeout-unit.enum';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>,
    private readonly rulesService: RulesService,
    private readonly workflowQueueService: WorkflowQueueService,
  ) {}

  async create(createWorkflowDto: CreateWorkflowDto): Promise<Workflow> {
    const rule = await this.rulesService.findOne(createWorkflowDto.ruleId);
    const deadline = this.calculateDeadline(
      new Date(),
      rule.timeoutValue,
      rule.timeoutUnit,
    );

    const workflow = this.workflowsRepository.create({
      ...createWorkflowDto,
      deadline,
      currentState: {
        receivedEvents: [],
        expectedEvents: rule.expectedEvents,
        operator: rule.operator,
      },
    });

    const saved = await this.workflowsRepository.save(workflow);

    await this.workflowQueueService.scheduleTimeout(
      saved.id,
      rule.id,
      saved.deadline,
    );
    return saved;
  }

  async findAll(): Promise<Workflow[]> {
    return this.workflowsRepository.find({
      order: { createdAt: 'DESC' },
      relations: { rule: true },
    });
  }

  async findOne(id: string): Promise<Workflow> {
    const workflow = await this.workflowsRepository.findOne({
      where: { id },
      relations: { rule: true },
    });

    if (!workflow) {
      throw new NotFoundException(`Workflow with id "${id}" not found`);
    }

    return workflow;
  }

  async update(
    id: string,
    updateWorkflowDto: UpdateWorkflowDto,
  ): Promise<Workflow> {
    const workflow = await this.findOne(id);
    Object.assign(workflow, updateWorkflowDto);
    return this.workflowsRepository.save(workflow);
  }

  async updateStatus(id: string, status: WorkflowStatus): Promise<Workflow> {
    const workflow = await this.findOne(id);
    workflow.status = status;
    return this.workflowsRepository.save(workflow);
  }

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowsRepository.remove(workflow);
  }

  async createFromRule(
    data: Partial<Workflow> & { ruleId: string; deadline: Date },
  ): Promise<Workflow> {
    const workflow = this.workflowsRepository.create(data);
    const saved = await this.workflowsRepository.save(workflow);

    await this.workflowQueueService.scheduleTimeout(
      saved.id,
      data.ruleId,
      saved.deadline,
    );
    return saved;
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
