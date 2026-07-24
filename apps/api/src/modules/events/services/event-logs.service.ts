import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EVENT_BUSINESS_EVENT_RECEIVED } from '../../../common/constants/event.constants';
import { Workflow } from '../../workflows/entities';
import { WorkflowsService } from '../../workflows/services/workflows.service';
import { CreateEventLogDto } from '../dto';
import { EventLog } from '../entities';
import { EventsService } from './events.service';
import { WorkflowEngineService } from './workflow-engine.service';

@Injectable()
export class EventLogsService {
  constructor(
    @InjectRepository(EventLog)
    private readonly logsRepository: Repository<EventLog>,
    private readonly eventsService: EventsService,
    private readonly workflowsService: WorkflowsService,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async ingest(
    dto: CreateEventLogDto,
  ): Promise<{ eventLog: EventLog; workflows: Workflow[] }> {
    const event = await this.eventsService.findOrCreateByName(
      dto.businessId,
      dto.eventName,
    );
    const externalWorkflow = dto.externalWorkflowId
      ? await this.workflowsService.findOrCreateExternalWorkflow(
          dto.businessId,
          dto.externalWorkflowId,
        )
      : null;

    const eventLog = await this.logsRepository.save(
      this.logsRepository.create({
        businessId: dto.businessId,
        eventId: event.id,
        event,
        timestamp: new Date(dto.timestamp),
        payload: dto.payload ?? {},
        externalWorkflowRecordId: externalWorkflow?.id ?? null,
        externalWorkflow,
      }),
    );

    this.eventEmitter.emit(EVENT_BUSINESS_EVENT_RECEIVED, {
      eventName: event.name,
      workflowId: dto.externalWorkflowId ?? '',
    });

    const workflows = externalWorkflow
      ? await this.workflowEngineService.processEvent(eventLog)
      : [];

    return { eventLog, workflows };
  }
}
