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
      'Workspace API key for machine-to-machine event ingestion. Use either this or a session bearer token.',
  })
  @ApiOperation({
    summary: 'Log a business event occurrence',
    description:
      'Accepts either an authenticated user session or a workspace API key via the X-API-Key header.',
  })
  @ApiCreatedResponse({ description: 'Event occurrence logged and processed' })
  create(
    @CurrentBusinessId() businessId: string,
    @Body() dto: CreateEventLogDto,
  ) {
    return this.eventLogsService.ingest(businessId, dto);
  }
}
