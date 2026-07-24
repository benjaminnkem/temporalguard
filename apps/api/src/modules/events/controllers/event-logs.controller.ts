import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateEventLogDto } from '../dto';
import { EventLogsService } from '../services/event-logs.service';

@ApiTags('event-logs')
@Controller('event-logs')
export class EventLogsController {
  constructor(private readonly eventLogsService: EventLogsService) {}

  @Post()
  @ApiOperation({ summary: 'Log a business event occurrence' })
  @ApiCreatedResponse({ description: 'Event occurrence logged and processed' })
  create(@Body() dto: CreateEventLogDto) {
    return this.eventLogsService.ingest(dto);
  }
}
