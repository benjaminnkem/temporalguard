import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InjectRepository } from '@nestjs/typeorm';
import { context, trace } from '@opentelemetry/api';
import { Repository } from 'typeorm';
import { EVENT_BUSINESS_EVENT_RECEIVED } from '../../../common/constants/event.constants';
import { Workflow } from '../../workflows/entities';
import { WorkflowsService } from '../../workflows/services/workflows.service';
import { CreateEventLogDto } from '../dto';
import { EventLog } from '../entities';
import { EventsService } from './events.service';
import { WorkflowEngineService } from './workflow-engine.service';

export type IngestOptions = {
  traceId?: string | null;
  spanId?: string | null;
};

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
    businessId: string,
    dto: CreateEventLogDto,
    options?: IngestOptions,
  ): Promise<{ eventLog: EventLog; workflows: Workflow[] }> {
    const event = await this.eventsService.findOrCreateByName(
      businessId,
      dto.eventName,
    );
    const externalWorkflow = dto.externalWorkflowId
      ? await this.workflowsService.findOrCreateExternalWorkflow(
          businessId,
          dto.externalWorkflowId,
        )
      : null;
    const spanContext = trace.getSpan(context.active())?.spanContext();

    const eventLog = await this.logsRepository.save(
      this.logsRepository.create({
        businessId,
        eventId: event.id,
        event,
        timestamp: new Date(dto.timestamp),
        payload: dto.payload ?? {},
        traceId: options?.traceId ?? spanContext?.traceId ?? null,
        spanId: options?.spanId ?? spanContext?.spanId ?? null,
        externalWorkflowRecordId: externalWorkflow?.id ?? null,
        externalWorkflow,
      }),
    );

    const workflows: Workflow[] = externalWorkflow
      ? await this.workflowEngineService.processEvent(eventLog)
      : [];

    const matchedWorkflows: Array<Workflow | null> =
      workflows.length > 0 ? workflows : [null];
    matchedWorkflows.forEach((workflow) => {
      this.eventEmitter.emit(EVENT_BUSINESS_EVENT_RECEIVED, {
        businessId,
        eventName: event.name,
        workflowId: workflow?.id,
        externalWorkflowId: dto.externalWorkflowId,
        eventLogId: eventLog.id,
        traceId: eventLog.traceId,
        spanId: eventLog.spanId,
      });
    });

    return { eventLog, workflows };
  }
}
