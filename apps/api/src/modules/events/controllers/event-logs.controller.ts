import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { User } from '../../users/entities';
import { CreateEventLogDto } from '../dto';
import { EventLogsService } from '../services/event-logs.service';

@ApiTags('event-logs')
@Controller('event-logs')
@UseGuards(AccessTokenGuard)
export class EventLogsController {
  constructor(private readonly eventLogsService: EventLogsService) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Log a business event occurrence' })
  @ApiCreatedResponse({ description: 'Event occurrence logged and processed' })
  create(@CurrentUser() user: User, @Body() dto: CreateEventLogDto) {
    return this.eventLogsService.ingest(user.businessId, dto);
  }
}
