import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateWorkflowDto, UpdateWorkflowDto } from '../dto';
import { Workflow } from '../entities';

@Injectable()
export class WorkflowsService {
  constructor(
    @InjectRepository(Workflow)
    private readonly workflowsRepository: Repository<Workflow>,
  ) {}

  async create(createWorkflowDto: CreateWorkflowDto): Promise<Workflow> {
    const workflow = this.workflowsRepository.create(createWorkflowDto);
    return this.workflowsRepository.save(workflow);
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

  async remove(id: string): Promise<void> {
    const workflow = await this.findOne(id);
    await this.workflowsRepository.remove(workflow);
  }

  async createFromRule(data: Partial<Workflow>): Promise<Workflow> {
    const workflow = this.workflowsRepository.create(data);
    return this.workflowsRepository.save(workflow);
  }
}
