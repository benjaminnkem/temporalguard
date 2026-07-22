import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkflowDto, UpdateWorkflowDto } from '../dto';
import { Workflow } from '../entities';
import { RulesService } from '../../rules/services/rules.service';
import { WorkflowQueueService } from './workflow-queue.service';
import { WorkflowStatus } from '../enums/workflow-status.enum';
import { TimeoutUnit } from '../../rules/enums/timeout-unit.enum';
import { TelemetryService } from '../../telemetry/services/telemetry.service';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>,
    private readonly rulesService: RulesService,
    private readonly workflowQueueService: WorkflowQueueService,
    private readonly telemetryService: TelemetryService,
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

    try {
      this.telemetryService.workflowStarted(saved.id, rule.id, rule.name, saved.status);
    } catch (e) {}

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
    const oldStatus = workflow.status;
    Object.assign(workflow, updateWorkflowDto);
    const saved = await this.workflowsRepository.save(workflow);

    if (oldStatus !== saved.status) {
      this.handleStatusChangeTelemetry(saved, oldStatus);
    }

    return saved;
  }

  async updateStatus(id: string, status: WorkflowStatus): Promise<Workflow> {
    const workflow = await this.findOne(id);
    const oldStatus = workflow.status;
    workflow.status = status;
    const saved = await this.workflowsRepository.save(workflow);

    if (oldStatus !== saved.status) {
      this.handleStatusChangeTelemetry(saved, oldStatus);
    }

    return saved;
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

    try {
      const rule = await this.rulesService.findOne(data.ruleId);
      this.telemetryService.workflowStarted(saved.id, rule.id, rule.name, saved.status);
    } catch (e) {}

    return saved;
  }

  private handleStatusChangeTelemetry(workflow: Workflow, _oldStatus: WorkflowStatus): void {
    const durationMs = Date.now() - workflow.createdAt.getTime();
    try {
      if (workflow.status === WorkflowStatus.COMPLETED) {
        this.telemetryService.workflowCompleted(
          workflow.id,
          workflow.ruleId,
          workflow.rule?.name || '',
          workflow.status,
          durationMs,
        );
      } else if (workflow.status === WorkflowStatus.OVERDUE) {
        this.telemetryService.workflowExpired(
          workflow.id,
          workflow.ruleId,
          workflow.rule?.name || '',
          workflow.status,
        );
      }
    } catch (e) {}
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
