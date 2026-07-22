import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from '../../workflows/entities';
import { CreateEventDto } from '../dto';
import { BusinessEvent } from '../entities';
import { WorkflowEngineService } from './workflow-engine.service';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(BusinessEvent)
    private readonly eventsRepository: Repository<BusinessEvent>,
    private readonly workflowEngineService: WorkflowEngineService,
  ) {}

  async ingest(
    createEventDto: CreateEventDto,
  ): Promise<{ event: BusinessEvent; workflows: Workflow[] }> {
    const event = this.eventsRepository.create({
      eventName: createEventDto.eventName,
      externalWorkflowId: createEventDto.workflowId,
      timestamp: new Date(createEventDto.timestamp),
      payload: createEventDto.payload ?? {},
    });
    const savedEvent = await this.eventsRepository.save(event);

    const workflows =
      await this.workflowEngineService.processEvent(savedEvent);

    return { event: savedEvent, workflows };
  }
}
