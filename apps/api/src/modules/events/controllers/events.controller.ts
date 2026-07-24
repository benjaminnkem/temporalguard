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
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateBusinessEventDto, UpdateBusinessEventDto } from '../dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../../auth/guards/access-token.guard';
import type { User } from '../../users/entities';
import { EventsService } from '../services/events.service';

@ApiTags('events')
@Controller('events')
@UseGuards(AccessTokenGuard)
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post()
  @ApiOperation({ summary: 'Create or reuse a business event definition' })
  @ApiCreatedResponse({ description: 'Event definition created or reused' })
  create(@CurrentUser() user: User, @Body() dto: CreateBusinessEventDto) {
    return this.eventsService.createOrReuse(user.businessId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List business event definitions' })
  @ApiOkResponse({ description: 'List of event definitions' })
  findAll(@CurrentUser() user: User) {
    return this.eventsService.findAll(user.businessId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.findOne(user.businessId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateBusinessEventDto,
  ) {
    return this.eventsService.update(user.businessId, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Event definition deleted' })
  remove(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.eventsService.remove(user.businessId, id);
  }
}
