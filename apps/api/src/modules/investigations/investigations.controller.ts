import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AccessTokenGuard } from '../auth/guards/access-token.guard';
import type { User } from '../users/entities';
import { StartInvestigationDto } from './dto/start-investigation.dto';
import { InvestigationStreamService } from './investigation-stream.service';
import { InvestigationsService } from './investigations.service';

@ApiTags('investigations')
@Controller('investigations')
@UseGuards(AccessTokenGuard)
export class InvestigationsController {
  constructor(
    private readonly service: InvestigationsService,
    private readonly stream: InvestigationStreamService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Start an idempotent investigation' })
  start(@CurrentUser() user: User, @Body() input: StartInvestigationDto) {
    return this.service.start(
      user.businessId,
      user.id,
      input.violationId,
      input.idempotencyKey,
    );
  }

  @Get()
  list(@CurrentUser() user: User) {
    return this.service.list(user.businessId);
  }

  @Get(':id')
  get(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.get(user.businessId, id);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.cancel(user.businessId, id, user.id);
  }

  @Post(':id/rerun')
  rerun(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.rerun(user.businessId, id, user.id);
  }

  @Get(':id/export')
  export(@CurrentUser() user: User, @Param('id', ParseUUIDPipe) id: string) {
    return this.service.export(user.businessId, id);
  }

  @Sse(':id/events')
  events(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Headers('last-event-id') lastEventId?: string,
  ) {
    return this.stream.stream(user.businessId, id, lastEventId);
  }
}
