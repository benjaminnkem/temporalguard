import { Injectable } from '@nestjs/common';
import { CreateEventDto } from '../dto';
import { IngestedEvent } from '../interfaces';

@Injectable()
export class EventsService {
  ingest(createEventDto: CreateEventDto): IngestedEvent {
    return {
      event: createEventDto.event,
      workflowId: createEventDto.workflowId,
      timestamp: createEventDto.timestamp,
      payload: createEventDto.payload ?? {},
    };
  }
}
