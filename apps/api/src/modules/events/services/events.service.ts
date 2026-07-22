import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workflow } from '../../workflows/entities';
import { CreateEventDto } from '../dto';
import { BusinessEvent } from '../entities';
import { WorkflowEngineService } from './workflow-engine.service';
import { TelemetryService } from '../../telemetry/services/telemetry.service';
import {
  SPAN_BUSINESS_EVENT_INGESTION,
  ATTR_EVENT_NAME,
  ATTR_WORKFLOW_ID,
} from '../../telemetry/constants/telemetry.constants';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(BusinessEvent)
    private readonly eventsRepository: Repository<BusinessEvent>,
    private readonly workflowEngineService: WorkflowEngineService,
    private readonly telemetryService: TelemetryService,
  ) {}

  async ingest(
    createEventDto: CreateEventDto,
  ): Promise<{ event: BusinessEvent; workflows: Workflow[] }> {
    return this.telemetryService.trace(
      SPAN_BUSINESS_EVENT_INGESTION,
      {
        [ATTR_EVENT_NAME]: createEventDto.eventName,
        [ATTR_WORKFLOW_ID]: createEventDto.workflowId,
      },
      async () => {
        const event = this.eventsRepository.create({
          eventName: createEventDto.eventName,
          externalWorkflowId: createEventDto.workflowId,
          timestamp: new Date(createEventDto.timestamp),
          payload: createEventDto.payload ?? {},
        });
        const savedEvent = await this.eventsRepository.save(event);

        try {
          this.telemetryService.businessEventReceived(
            savedEvent.eventName,
            savedEvent.externalWorkflowId,
          );
        } catch (e) {}

        const workflows =
          await this.workflowEngineService.processEvent(savedEvent);

        return { event: savedEvent, workflows };
      },
    );
  }
}
