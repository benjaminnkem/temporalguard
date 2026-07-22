import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { Workflow } from '../../workflows/entities';
import { CreateEventDto } from '../dto';
import { BusinessEvent } from '../entities';
import { WorkflowEngineService } from './workflow-engine.service';
import { EVENT_BUSINESS_EVENT_RECEIVED } from '../../../common/constants/event.constants';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(BusinessEvent)
    private readonly eventsRepository: Repository<BusinessEvent>,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly eventEmitter: EventEmitter2,
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

    try {
      this.eventEmitter.emit(EVENT_BUSINESS_EVENT_RECEIVED, {
        eventName: savedEvent.eventName,
        workflowId: savedEvent.externalWorkflowId,
      });
    } catch (e) {}

    const workflows =
      await this.workflowEngineService.processEvent(savedEvent);

    return { event: savedEvent, workflows };
  }
}
