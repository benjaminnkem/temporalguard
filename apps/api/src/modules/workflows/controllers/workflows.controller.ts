import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Sse,
  UseGuards,
  type MessageEvent,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateWorkflowDto, UpdateWorkflowDto } from '../dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { User } from '../../users/entities';
import { Observable } from 'rxjs';
import {
  EVENT_BUSINESS_EVENT_RECEIVED,
  EVENT_VIOLATION_CREATED,
  EVENT_WORKFLOW_COMPLETED,
  EVENT_WORKFLOW_CREATED,
  EVENT_WORKFLOW_OVERDUE,
} from '../../../common/constants/event.constants';
import { WorkflowsService } from '../services/workflows.service';
import { SigNozObservabilityService } from '../services/signoz-observability.service';

@ApiTags('workflows')
@Controller('workflows')
@UseGuards(AccessTokenGuard)
export class WorkflowsController {
  constructor(
    private readonly workflowsService: WorkflowsService,
    private readonly eventEmitter: EventEmitter2,
    private readonly signozObservabilityService: SigNozObservabilityService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Create a workflow' })
  @ApiCreatedResponse({ description: 'Workflow created' })
  create(
    @CurrentUser() user: User,
    @Body() createWorkflowDto: CreateWorkflowDto,
  ) {
    return this.workflowsService.create(user.businessId, createWorkflowDto);
  }

  @Get()
  @ApiOperation({ summary: 'List all workflows' })
  @ApiOkResponse({ description: 'List of workflows' })
  findAll(@CurrentUser() user: User) {
    return this.workflowsService.findAll(user.businessId);
  }

  @Sse('stream')
  @ApiOperation({ summary: 'Stream workspace workflow and violation changes' })
  stream(@CurrentUser() user: User): Observable<MessageEvent> {
    const names = [
      EVENT_BUSINESS_EVENT_RECEIVED,
      EVENT_WORKFLOW_CREATED,
      EVENT_WORKFLOW_COMPLETED,
      EVENT_WORKFLOW_OVERDUE,
      EVENT_VIOLATION_CREATED,
    ];
    return new Observable<MessageEvent>((subscriber) => {
      const handlers = names.map((name) => {
        const handler = (payload: { businessId?: string }) => {
          if (payload.businessId !== user.businessId) return;
          subscriber.next({ data: { type: name, payload } });
        };
        this.eventEmitter.on(name, handler);
        return { name, handler };
      });
      const heartbeat = setInterval(
        () =>
          subscriber.next({
            data: { type: 'heartbeat', timestamp: new Date().toISOString() },
          }),
        15_000,
      );
      return () => {
        clearInterval(heartbeat);
        handlers.forEach(({ name, handler }) =>
          this.eventEmitter.off(name, handler),
        );
      };
    });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a workflow by id' })
  @ApiOkResponse({ description: 'Workflow found' })
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflowsService.findOne(user.businessId, id);
  }

  @Get(':id/observability/traces')
  @ApiOperation({ summary: 'Query SigNoz traces correlated to a workflow' })
  @ApiOkResponse({ description: 'Live SigNoz trace preview' })
  async findTraces(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const workflow = await this.workflowsService.findOne(user.businessId, id);
    return this.signozObservabilityService.queryTraces(workflow);
  }

  @Get(':id/observability/logs')
  @ApiOperation({ summary: 'Query SigNoz logs correlated to a workflow' })
  @ApiOkResponse({ description: 'Live SigNoz log preview' })
  async findLogs(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const workflow = await this.workflowsService.findOne(user.businessId, id);
    return this.signozObservabilityService.queryLogs(workflow);
  }

  @Get(':id/observability/metrics')
  @ApiOperation({ summary: 'Query SigNoz metrics correlated to a workflow' })
  @ApiOkResponse({ description: 'Live SigNoz metric preview' })
  async findMetrics(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    const workflow = await this.workflowsService.findOne(user.businessId, id);
    return this.signozObservabilityService.queryMetrics(workflow);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a workflow' })
  @ApiOkResponse({ description: 'Workflow updated' })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateWorkflowDto: UpdateWorkflowDto,
  ) {
    return this.workflowsService.update(user.businessId, id, updateWorkflowDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a workflow' })
  @ApiNoContentResponse({ description: 'Workflow deleted' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.workflowsService.remove(user.businessId, id);
  }
}
