import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiHeader,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentBusinessId } from '../../businesses/decorators/current-business-id.decorator';
import { WorkspaceAuthGuard } from '../../businesses/guards/workspace-auth.guard';
import { CreateEventLogDto } from '../dto';
import { EventLogsService } from '../services/event-logs.service';

@ApiTags('event-logs')
@Controller('event-logs')
@UseGuards(WorkspaceAuthGuard)
export class EventLogsController {
  constructor(private readonly eventLogsService: EventLogsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiHeader({
    name: 'x-api-key',
    required: false,
    description:
      'Workspace API key for machine-to-machine event ingestion. Prefer public POST /api/v1/events for new integrations.',
  })
  @ApiOperation({
    summary: 'Log a business event occurrence (legacy / internal)',
    description:
      'Accepts a session JWT or workspace API key (X-API-Key or Authorization: Bearer tg_…). Public SDK contract is POST /api/v1/events.',
  })
  @ApiCreatedResponse({ description: 'Event occurrence logged and processed' })
  create(
    @CurrentBusinessId() businessId: string,
    @Body() dto: CreateEventLogDto,
  ) {
    return this.eventLogsService.ingest(businessId, dto);
  }
}
