import { Body, Controller, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CreateEventDto } from '../dto';
import { EventsService } from '../services/events.service';

@ApiTags('events')
@Controller('events')
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Ingest a business event' })
  @ApiCreatedResponse({ description: 'Event accepted and returned as-is' })
  create(@Body() createEventDto: CreateEventDto) {
    return this.eventsService.ingest(createEventDto);
  }
}
